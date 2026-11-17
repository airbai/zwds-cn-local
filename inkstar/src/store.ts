import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { deviceLang } from '@/i18n';
import { type Lang, localDay, type Profile } from '@/lib/chart';
import { bestPlan, type PlanId } from '@/lib/purchases';

export const FREE_DAILY_QUESTIONS = 3;

export interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface State {
  hydrated: boolean;
  lang: Lang;
  profile: Profile | null;
  plus: boolean;
  /** every plan StoreKit reports as active; a lifetime buyer may still have a subscription running */
  owned: PlanId[];
  /** the highest of `owned`, or null for free */
  plan: PlanId | null;
  deviceId: string;
  asked: { day: string; count: number };
  thread: Msg[];
  /** question queued by another screen for the Ask tab to send */
  pendingQuestion: string | null;
  setLang: (l: Lang) => void;
  setProfile: (p: Profile | null) => void;
  setOwned: (owned: PlanId[]) => void;
  /** a purchase just completed, before StoreKit's list is re-read */
  grant: (plan: PlanId) => void;
  setThread: (m: Msg[]) => void;
  setPending: (q: string | null) => void;
  countQuestion: () => void;
  questionsLeft: () => number;
  erase: () => void;
}

const today = () => localDay();
const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      lang: deviceLang(),
      profile: null,
      plus: false,
      owned: [],
      plan: null,
      deviceId: newId(),
      asked: { day: today(), count: 0 },
      thread: [],
      pendingQuestion: null,
      setLang: (lang) => {
        i18n.changeLanguage(lang);
        set({ lang });
      },
      setProfile: (profile) => set({ profile }),
      setOwned: (owned) => set({ owned, plan: bestPlan(owned), plus: owned.length > 0 }),
      grant: (p) => get().setOwned([...new Set([...get().owned, p])]),
      setThread: (thread) => set({ thread }),
      setPending: (pendingQuestion) => set({ pendingQuestion }),
      countQuestion: () => {
        const a = get().asked;
        set({ asked: a.day === today() ? { day: a.day, count: a.count + 1 } : { day: today(), count: 1 } });
      },
      questionsLeft: () => {
        const a = get().asked;
        return Math.max(0, FREE_DAILY_QUESTIONS - (a.day === today() ? a.count : 0));
      },
      erase: () => set({ profile: null, thread: [], asked: { day: today(), count: 0 } }),
    }),
    {
      name: 'inkstar',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lang, profile, plus, owned, plan, deviceId, asked, thread }) => ({ lang, profile, plus, owned, plan, deviceId, asked, thread }),
      onRehydrateStorage: () => (state) => {
        if (state) i18n.changeLanguage(state.lang);
        useStore.setState({ hydrated: true });
        // Development only: EXPO_PUBLIC_DEMO="1990-5-17|3|female|Mei|ja" opens straight into a seeded chart.
        const demo = __DEV__ ? process.env.EXPO_PUBLIC_DEMO : undefined;
        if (demo) {
          const [date, hour, gender, name, lang, question] = demo.split('|');
          useStore.setState({ profile: { name, date, hour: Number(hour), hourKnown: true, gender: gender as 'female' | 'male' } });
          if (lang) useStore.getState().setLang(lang as Lang);
          if (question) useStore.setState({ pendingQuestion: question, thread: [] });
        }
      },
    },
  ),
);
