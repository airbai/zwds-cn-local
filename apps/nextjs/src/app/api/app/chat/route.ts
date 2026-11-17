// Inkstar iOS app: chart-grounded reading, streamed as plain text.
// Public route (no web session) — see publicRoute in middleware.ts.
import { kv } from "@vercel/kv";
import { type NextRequest, NextResponse } from "next/server";

const LANG_NAME: Record<string, string> = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  "zh-Hant": "Traditional Chinese",
};

/** Hard per-device ceiling that protects model spend; the free allowance itself is enforced in the app. */
const DAILY_CAP = 60;
const MAX_FACTS = 9000;
const MAX_MESSAGE = 1200;

function systemPrompt(facts: string, lang: string) {
  return `You are the reader inside Inkstar, an app that presents a traditional Chinese twelve-palace star chart. You read like an experienced, kind practitioner sitting with the user: you interpret, you do not recite data.

The user's chart was computed by the app's engine from their own birth date, hour and gender, and is given below as CHART FACTS: the natal palaces, plus the time layers that are active now (大限 decade, 流年 year, 流月 month, 流日 day), each with the natal palace its life palace sits on, its four transformations and the natal palace each lands in, its flowing stars, and an overlay of the period's twelve palaces on the natal ones. It is the only source of truth about the chart.

How to read:
- Treat it as this person's chart. Open with the conclusion for their question in one or two sentences, then give the two or three placements it rests on, then one practical, concrete suggestion.
- Match the question to the right layer: today -> 流日; this month -> 流月; this year -> 流年; these ten years -> 大限; character, talents, relationships in general -> natal. Combine the layer with the natal palace it falls on and the stars there, and check the palace's three-sides-and-four-alignments (the palace, its opposite, and the two in trine) when it helps.
- For a topic such as money, work or love, use the matching palace both in the natal chart and in the layer's overlay (for example this month's 財帛 is the natal palace listed as 財帛= in the 流月 overlay), and say what the layer's transformations do to it.
- Write brightness as the traditional grade (廟 strong, 旺, 得, 利, 平, 不, 陷 weak) or in plain words in non-Chinese replies. Never print brightness numbers, the letters A/B/C/D, engine keys, or phrases like "brightness -3" or "帶B".
- If the user uses a word the facts do not define, map it to the closest concept and answer, mentioning the mapping in a few words. The app's own screen words are listed in CHART FACTS ("今日四象" is the day's four transformations). Only say something is unavailable when the facts truly cannot support it, such as a specific future date; then offer the nearest layer you can read.
- Never invent a star, palace, grade or transformation that is not in CHART FACTS.

Conversation:
- Earlier turns are the context of this conversation. Build on them: link a new question to what was already discussed when it is related, and stay consistent with what you said.
- If the user asks something already answered, do not say it was asked before and do not repeat yourself. Give a new angle on the same reading (another palace in the alignment, the other layer, a concrete do and don't) in a shorter answer.

Boundaries:
- Warm and frank. No flattery, no fear. Do not predict specific events, dates, illness, death or windfalls; describe tendencies and let the user judge. Never tell the user facts about their life.
- No medical, legal or financial advice; for money questions talk about tendencies and habits, not investments. No upselling.
- Refer to the system as "your star chart" or "the twelve palaces". Do not use the terms "Zi Wei Dou Shu" or "紫微斗數".
- Language: reply in the language and script of the user's most recent message (Simplified Chinese if they write Simplified, Traditional if they write Traditional), whatever the app language is. Only if that message has no clear language (a name, a number, an emoji) fall back to ${LANG_NAME[lang] ?? "English"}.
- Star and palace names may be given as key/localName. In an English reply write the key, capitalised (for example "Marshal"); in a Chinese reply write the Chinese name in the user's script; in any other language use the local name given, or translate the name naturally.
- Plain prose in short paragraphs, no markdown symbols, at most 220 words unless asked for more.

CHART FACTS
${facts}`;
}

export async function POST(req: NextRequest) {
  let body: {
    messages?: { role: string; content: string }[];
    facts?: string;
    lang?: string;
    deviceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const { messages, facts, lang = "en", deviceId } = body;
  if (!Array.isArray(messages) || messages.length === 0 || typeof facts !== "string" || !deviceId) {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (facts.length > MAX_FACTS) return new NextResponse("Bad request", { status: 400 });

  // Best-effort spend guard; the route still works when KV is not configured.
  try {
    const key = `inkstar:ask:${String(deviceId).slice(0, 64)}:${new Date().toISOString().slice(0, 10)}`;
    const used = await kv.incr(key);
    if (used === 1) await kv.expire(key, 60 * 60 * 26);
    if (used > DAILY_CAP) return new NextResponse("Daily limit reached", { status: 429 });
  } catch {
    /* KV unavailable */
  }

  // Same OpenAI-compatible provider the site's own chat uses (Custom_* in .env).
  const base = (process.env.Custom_BASE_URL ?? "https://api.deepseek.com/v1").replace(/\/$/, "");
  const apiUrl = `${base}/chat/completions`;
  const apiKey = process.env.Custom_API_KEY;
  const model = process.env.INKSTAR_MODEL ?? "deepseek-flash";
  if (!apiUrl || !apiKey || !model) return new NextResponse("Not configured", { status: 500 });

  const history = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE) }));

  const upstream = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      stream: true,
      messages: [{ role: "system", content: systemPrompt(facts, lang) }, ...history],
    }),
  });
  if (!upstream.ok || !upstream.body) return new NextResponse("Upstream error", { status: 502 });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      // Keep reading until some answer text is forwarded: reasoning models emit long runs of
      // chunks with no content, and a pull that enqueues nothing is never called again.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return controller.close();
        // SSE lines can be split across chunks, so keep the unfinished tail for the next read.
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let wrote = false;
        for (const line of lines) {
          const data = line.trim();
          if (!data.startsWith("data:")) continue;
          const payload = data.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const text = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
              wrote = true;
            }
          } catch {
            /* ignore malformed line */
          }
        }
        if (wrote) return;
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
