import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { Lang } from '@/lib/chart';

import en from './en';
import ja from './ja';
import ko from './ko';
import zhHant from './zh-Hant';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-Hant', label: '繁體中文' },
];

export function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'en';
  if (code === 'ko') return 'ko';
  if (code === 'ja') return 'ja';
  if (code === 'zh') return 'zh-Hant';
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja },
    'zh-Hant': { translation: zhHant },
  },
  lng: deviceLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
