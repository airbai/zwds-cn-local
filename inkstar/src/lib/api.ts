import { fetch as streamingFetch } from 'expo/fetch';

import type { Lang } from './chart';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'https://ziwei.youxiaojia.cn';

export const TERMS_URL = `${API_BASE}/html/inkstar-terms.html`;
export const PRIVACY_URL = `${API_BASE}/html/inkstar-privacy.html`;

export interface AskInput {
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** engine-computed chart facts; the server builds the system prompt around them */
  facts: string;
  lang: Lang;
  deviceId: string;
  plus: boolean;
}

/** Streams a plain-text answer, calling onDelta with the text so far. */
export async function askChart(input: AskInput, onDelta: (full: string) => void, signal?: AbortSignal) {
  const res = await streamingFetch(`${API_BASE}/api/app/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
    body: JSON.stringify(input),
    signal,
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) throw new Error(`ask failed: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    onDelta(text);
    return text;
  }
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
  if (!full.trim()) throw new Error('empty answer');
  return full;
}
