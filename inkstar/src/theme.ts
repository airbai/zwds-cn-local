import { Platform } from 'react-native';

/** Ink-night palette: sumi black, rice paper, cinnabar seal, aged gold. */
export const C = {
  ink: '#0B0D12',
  inkSoft: '#12151C',
  panel: '#171B24',
  panelHi: '#1E2330',
  line: 'rgba(232, 220, 196, 0.14)',
  lineStrong: 'rgba(232, 220, 196, 0.32)',
  paper: '#EFE6D3',
  paperDim: 'rgba(239, 230, 211, 0.66)',
  paperFaint: 'rgba(239, 230, 211, 0.38)',
  gold: '#CBA869',
  goldDim: 'rgba(203, 168, 105, 0.5)',
  cinnabar: '#C8442E',
  cinnabarSoft: 'rgba(200, 68, 46, 0.16)',
  jade: '#7FB6A1',
  mist: '#8E9BB3',
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

const cjkSerif: Record<string, string> = {
  ja: 'Hiragino Mincho ProN',
  ko: 'AppleMyungjo',
  'zh-Hant': 'Songti TC',
};

/** Display serif: Cormorant for Latin, the system Mincho/Myeongjo/Songti for CJK. */
export function serif(lang: string, weight: 'regular' | 'medium' | 'semibold' = 'medium') {
  if (lang !== 'en' && Platform.OS === 'ios') return cjkSerif[lang] ?? 'Songti TC';
  if (lang !== 'en') return Platform.select({ web: 'serif', default: 'serif' })!;
  return weight === 'regular'
    ? 'CormorantGaramond_400Regular'
    : weight === 'semibold'
      ? 'CormorantGaramond_600SemiBold'
      : 'CormorantGaramond_500Medium';
}

/** CJK glyphs used as ornament (branches, seals) regardless of UI language. */
export const glyphFont = Platform.select({ ios: 'Songti TC', default: 'serif' })!;
