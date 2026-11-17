import { astro } from 'iztro';

export type Lang = 'en' | 'ko' | 'ja' | 'zh-Hant';
export type Gender = 'female' | 'male';

export interface Profile {
  name: string;
  /** YYYY-M-D, Gregorian */
  date: string;
  /** 0..12 double-hour index (0 = early Rat 00-01, 12 = late Rat 23-24) */
  hour: number;
  hourKnown: boolean;
  gender: Gender;
}

const ENGINE_LOCALE: Record<Lang, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  'zh-Hant': 'zh-TW',
};

/** Clock ranges for the 13 double-hour slots the engine uses. */
export const HOUR_SLOTS = [
  '00:00–01:00', '01:00–03:00', '03:00–05:00', '05:00–07:00', '07:00–09:00',
  '09:00–11:00', '11:00–13:00', '13:00–15:00', '15:00–17:00', '17:00–19:00',
  '19:00–21:00', '21:00–23:00', '23:00–24:00',
];
export const HOUR_GLYPHS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子'];

const BRANCH_GLYPH: Record<string, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  woo: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};
const STEM_GLYPH: Record<string, string> = {
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};

/** Board position (col,row in a 4x4 grid) for each earthly branch. */
export const BRANCH_CELL: Record<string, [number, number]> = {
  si: [0, 0], woo: [1, 0], wei: [2, 0], shen: [3, 0],
  chen: [0, 1], you: [3, 1],
  mao: [0, 2], xu: [3, 2],
  yin: [0, 3], chou: [1, 3], zi: [2, 3], hai: [3, 3],
};

export interface StarView {
  key: string;
  label: string;
  /** -3..3, or null when the engine gives no brightness */
  bright: number | null;
  /** A wealth · B power · C fame · D obstacle */
  mutagen: 'A' | 'B' | 'C' | 'D' | null;
}

export interface PalaceView {
  index: number;
  key: string;
  label: string;
  branch: string;
  branchGlyph: string;
  stemGlyph: string;
  isBody: boolean;
  major: StarView[];
  minor: StarView[];
  other: string[];
  decade: [number, number];
  cell: [number, number];
}

export interface ChartView {
  palaces: PalaceView[];
  soulIndex: number;
  element: string;
  elementKey: string;
  soulStar: string;
  bodyStar: string;
  zodiac: string;
  zodiacKey: string;
  sign: string;
  lunarDate: string;
  pillars: string;
  /** indices of the palace's "three sides and four alignments" */
  surrounding: (index: number) => number[];
}

function parseBright(b: string): number | null {
  const m = /\[([+-]?\d)\]/.exec(b || '');
  return m ? Number(m[1]) : null;
}

/** Friendlier English for a few of the engine's literal translations. */
const EN_LABEL: Record<string, string> = { surface: 'Travel', advocator: 'Advocate' };

function title(s: string) {
  const w = EN_LABEL[s] ?? s;
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

const cache = new Map<string, ChartView>();

export function buildChart(p: Profile, lang: Lang): ChartView {
  const id = `${p.date}|${p.hour}|${p.gender}|${lang}`;
  const hit = cache.get(id);
  if (hit) return hit;

  // The English chart supplies stable keys; the localized one supplies labels.
  const k = astro.bySolar(p.date, p.hour, p.gender, true, 'en-US');
  const l = lang === 'en' ? k : astro.bySolar(p.date, p.hour, p.gender, true, ENGINE_LOCALE[lang] as never);
  const pretty = (s: string) => (lang === 'en' ? title(s) : s);

  const palaces: PalaceView[] = k.palaces.map((kp, i) => {
    const lp = l.palaces[i];
    const stars = (ks: typeof kp.majorStars, ls: typeof lp.majorStars): StarView[] =>
      ks.map((s, j) => ({
        key: s.name,
        label: pretty(ls[j].name),
        bright: parseBright(s.brightness ?? ''),
        mutagen: (s.mutagen as StarView['mutagen']) || null,
      }));
    return {
      index: i,
      key: kp.name,
      label: pretty(lp.name),
      branch: kp.earthlyBranch,
      branchGlyph: BRANCH_GLYPH[kp.earthlyBranch] ?? '',
      stemGlyph: STEM_GLYPH[kp.heavenlyStem] ?? '',
      isBody: kp.isBodyPalace,
      major: stars(kp.majorStars, lp.majorStars),
      minor: stars(kp.minorStars, lp.minorStars),
      other: lp.adjectiveStars.map((s) => pretty(s.name)),
      decade: kp.decadal.range as [number, number],
      cell: BRANCH_CELL[kp.earthlyBranch],
    };
  });

  const view: ChartView = {
    palaces,
    soulIndex: palaces.findIndex((x) => x.key === 'soul'),
    element: lang === 'en' ? `${title(k.fiveElementsClass.split(' ')[0])} element` : l.fiveElementsClass,
    elementKey: k.fiveElementsClass.split(' ')[0],
    soulStar: pretty(l.soul),
    bodyStar: pretty(l.body),
    zodiac: pretty(l.zodiac),
    zodiacKey: k.zodiac,
    sign: pretty(l.sign),
    lunarDate: l.lunarDate,
    pillars: astro.bySolar(p.date, p.hour, p.gender, true, 'zh-TW').chineseDate,
    surrounding: (index) => [index, (index + 6) % 12, (index + 4) % 12, (index + 8) % 12],
  };
  cache.set(id, view);
  return view;
}

export interface TodayView {
  /** natal palace that carries today's focus */
  focus: PalaceView;
  dayPillar: string;
  lunar: string;
  /** stars receiving today's four transformations: wealth, power, fame, obstacle */
  flows: { type: 'A' | 'B' | 'C' | 'D'; star: string; palace: PalaceView | null }[];
  age: number;
  decade: PalaceView;
  year: PalaceView;
}

export function buildToday(p: Profile, lang: Lang, when = new Date()): TodayView {
  const chart = buildChart(p, lang);
  const k = astro.bySolar(p.date, p.hour, p.gender, true, 'en-US');
  const hk = k.horoscope(when);
  const l = lang === 'en' ? k : astro.bySolar(p.date, p.hour, p.gender, true, ENGINE_LOCALE[lang] as never);
  const hl = lang === 'en' ? hk : l.horoscope(when);
  const types = ['A', 'B', 'C', 'D'] as const;
  const flows = hk.daily.mutagen.map((starKey, i) => {
    const palace = chart.palaces.find((x) => [...x.major, ...x.minor].some((s) => s.key === starKey)) ?? null;
    const label = lang === 'en' ? title(starKey) : hl.daily.mutagen[i];
    return { type: types[i], star: label, palace };
  });
  return {
    focus: chart.palaces[hk.daily.index],
    dayPillar: (STEM_GLYPH[hk.daily.heavenlyStem] ?? '') + (BRANCH_GLYPH[hk.daily.earthlyBranch] ?? ''),
    lunar: hl.lunarDate,
    flows,
    age: hk.age.nominalAge,
    decade: chart.palaces[hk.decadal.index],
    year: chart.palaces[hk.yearly.index],
  };
}

const FLOW_NAMES: Record<Lang, string> = {
  en: 'A=Abundance, B=Authority, C=Recognition, D=Friction',
  'zh-Hant': 'A=化祿, B=化權, C=化科, D=化忌',
  ja: 'A=化禄, B=化権, C=化科, D=化忌',
  ko: 'A=화록, B=화권, C=화과, D=화기',
};
/** What the Today screen calls the day's four transformations, per interface language. */
const TODAY_WORDS: Record<Lang, string> = {
  en: '"Four currents of the day" (Abundance, Authority, Recognition, Friction); "Today\u2019s light falls on" = the day palace',
  'zh-Hant': '「今日四象」(豐盈、主導、名聲、阻滯)；「今日星光落在」= 流日所在宮',
  ja: '「今日の四つの流れ」(豊かさ、主導、評価、滞り)；「今日の光が差すのは」= 流日の宮',
  ko: '「오늘의 네 가지 흐름」(풍요, 주도, 인정, 막힘)；「오늘의 빛이 머무는 곳」= 유일의 궁',
};
const LANG_NAME: Record<Lang, string> = { en: 'English', 'zh-Hant': 'Chinese', ja: 'Japanese', ko: 'Korean' };
/** Engine brightness -3..3 as the traditional seven grades. */
const BRIGHT_GRADE: Record<number, string> = { 3: '廟', 2: '旺', 1: '得', 0: '利', [-1]: '平', [-2]: '不', [-3]: '陷' };
const ZH_MUT = { A: '化祿', B: '化權', C: '化科', D: '化忌' } as const;
const LAYERS = [
  ['decadal', '大限 decade'],
  ['yearly', '流年 year'],
  ['monthly', '流月 month'],
  ['daily', '流日 day'],
] as const;

/** Local calendar date (the engine reads Date in local time too), not the UTC one. */
export function localDay(when = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
}

/**
 * Compact chart facts handed to the reading model so it cannot invent the chart.
 * The reply follows the language the user types in, which may differ from the app language,
 * so every star and palace carries its key, its Chinese name and, for Japanese and Korean
 * interfaces, the name in that language too.
 */
export function chartFacts(p: Profile, lang: Lang, when = new Date()): string {
  const zh = buildChart(p, 'zh-Hant');
  const local = lang === 'ja' || lang === 'ko' ? buildChart(p, lang) : null;
  const t = buildToday(p, 'zh-Hant', when);
  const tag = (key: string, zhName: string, localName?: string) => `${key}/${zhName}${localName ? `/${localName}` : ''}`;
  const star = (s: StarView, l?: StarView) =>
    `${tag(s.key, s.label, l?.label)}${s.bright !== null ? `(${BRIGHT_GRADE[s.bright]} ${s.bright > 0 ? '+' : ''}${s.bright})` : ''}${s.mutagen ? `[natal ${ZH_MUT[s.mutagen]}]` : ''}`;
  const palace = (x: PalaceView) => tag(x.key, x.label, local?.palaces[x.index].label);
  const rows = zh.palaces.map((x) => {
    const l = local?.palaces[x.index];
    return `- ${palace(x)}${x.isBody ? ' (body)' : ''} @${x.stemGlyph}${x.branchGlyph}: major=[${x.major.map((s, j) => star(s, l?.major[j])).join(', ') || 'empty'}] minor=[${x.minor.map((s, j) => star(s, l?.minor[j])).join(', ')}] other=[${x.other.join(', ')}] decade=${x.decade[0]}-${x.decade[1]}`;
  });

  // Time layers: where each period's own life palace sits on the natal board, the period's four
  // transformations (star -> natal palace holding it) and its flowing stars (-> natal palace).
  const hk = astro.bySolar(p.date, p.hour, p.gender, true, 'en-US').horoscope(when);
  const hz = astro.bySolar(p.date, p.hour, p.gender, true, 'zh-TW').horoscope(when);
  const holder = (key: string) => zh.palaces.find((x) => [...x.major, ...x.minor].some((s) => s.key === key));
  const layers = LAYERS.map(([k, name]) => {
    const e = hk[k];
    const z = hz[k];
    const muts = e.mutagen
      .map((key, i) => {
        const h = holder(key);
        return `${Object.values(ZH_MUT)[i]} ${tag(key, z.mutagen[i])} -> ${h ? h.label : 'not on the board'}`;
      })
      .join('; ');
    const flowing = (z.stars ?? [])
      .flatMap((list, i) => list.map((s) => `${s.name}->${zh.palaces[i].label}`))
      .join(', ');
    // the period's own twelve palaces laid over the natal ones (period name = natal palace)
    const overlay = z.palaceNames.map((n, i) => `${n}=${zh.palaces[i].label}`).join(', ');
    const range = k === 'decadal' ? ` ages ${zh.palaces[e.index].decade[0]}-${zh.palaces[e.index].decade[1]}` : '';
    return `- ${name}${range} ${STEM_GLYPH[e.heavenlyStem] ?? ''}${BRANCH_GLYPH[e.earthlyBranch] ?? ''}: life palace on natal ${palace(zh.palaces[e.index])}; transformations: ${muts}${flowing ? `; flowing stars: ${flowing}` : ''}; overlay: ${overlay}`;
  });

  return [
    `Names are written key/Chinese${local ? `/${LANG_NAME[lang]}` : ''}. Use the form that matches the language of your reply; never mix forms and never write the key in a non-English reply.`,
    `Transformation names by language — English: ${FLOW_NAMES.en}; Chinese: ${FLOW_NAMES['zh-Hant']}${local ? `; ${LANG_NAME[lang]}: ${FLOW_NAMES[lang]}` : ''}. Never write "transformation A" or a bare letter.`,
    'Brightness is given as grade and number: 廟 +3, 旺 +2, 得 +1, 利 0, 平 -1, 不 -2, 陷 -3.',
    `App vocabulary the user may quote: ${TODAY_WORDS[lang]}. These are the 流日 transformations below.`,
    `gender=${p.gender}; birth=${p.date}; hourSlot=${HOUR_SLOTS[p.hour]}${p.hourKnown ? '' : ' (birth hour unknown, noon assumed — say so when it matters)'}`,
    `element=${zh.element}; zodiac=${zh.zodiac}; lunar=${zh.lunarDate}; pillars=${zh.pillars}; soulStar=${zh.soulStar}; bodyStar=${zh.bodyStar}`,
    `today=${localDay(when)} (lunar ${hz.lunarDate}); nominalAge=${t.age}`,
    'natal palaces:',
    ...rows,
    'time layers (now):',
    ...layers,
  ].join('\n');
}
