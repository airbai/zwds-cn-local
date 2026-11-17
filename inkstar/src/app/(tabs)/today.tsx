import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { DockAction, useDockInset } from '@/components/dock';
import { StarDial } from '@/components/star-dial';
import { Screen, T, tap } from '@/components/ui';
import { buildToday } from '@/lib/chart';
import { useStore } from '@/store';
import { C, S } from '@/theme';

const FLOW_COLOR = { A: C.jade, B: C.gold, C: C.mist, D: C.cinnabar };
const LOCALE = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP', 'zh-Hant': 'zh-TW' } as const;

export default function Today() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, lang, setPending } = useStore();
  const day = new Date().toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => buildToday(profile!, lang), [profile, lang, day]);
  const dateLabel = new Date().toLocaleDateString(LOCALE[lang], { weekday: 'long', month: 'long', day: 'numeric' });
  const dial = Math.min(width - 48, 340);
  const dockInset = useDockInset(true);

  const ask = (q: string) => {
    setPending(q);
    router.navigate('/(tabs)/ask');
  };

  const [a, b] = today.decade.decade;
  const progress = Math.min(1, Math.max(0, (today.age - a + 0.5) / (b - a + 1)));

  return (
    <Screen pad={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: dockInset }}>
        <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg }}>
          <T v="label">{dateLabel}</T>
          <T v="title" style={{ marginTop: 6 }}>
            {t('today.greeting', { name: profile!.name })}
          </T>
        </View>

        {/* the day, drawn as a compass plate */}
        <View style={{ alignItems: 'center', marginTop: S.xl }}>
          <StarDial
            size={dial}
            focusBranch={today.focus.branch}
            pillar={today.dayPillar}
            caption={today.lunar}
            marks={today.flows.filter((f) => f.palace).map((f) => ({ branch: f.palace!.branch, color: FLOW_COLOR[f.type] }))}
          />
        </View>

        <View style={{ alignItems: 'center', paddingHorizontal: S.xl, marginTop: S.xl }}>
          <T v="label">{t('today.focus')}</T>
          <T v="display" style={{ marginTop: 6, textAlign: 'center' }}>
            {today.focus.label}
          </T>
          {today.focus.major.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={st.hair} />
              <T v="small" color={C.gold}>
                {today.focus.major.map((s) => s.label).join(' · ')}
              </T>
              <View style={st.hair} />
            </View>
          )}
          <T style={{ marginTop: S.lg, textAlign: 'center', fontSize: 17, lineHeight: lang === 'en' ? 26 : 30 }}>{t(`focus.${today.focus.key}`)}</T>
        </View>

        {/* four currents as a 2×2 of quiet tiles */}
        <T v="label" style={st.h}>
          {t('today.flows')}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: S.xl }}>
          {today.flows.map((f) => (
            <View key={f.type} style={[st.tile, { width: (width - S.xl * 2 - 10) / 2 }]}>
              <LinearGradient colors={[`${FLOW_COLOR[f.type]}26`, 'rgba(23,27,36,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: FLOW_COLOR[f.type] }} />
                <T v="label" color={FLOW_COLOR[f.type]}>
                  {t(`flow.${f.type}`)}
                </T>
              </View>
              <T v="heading" style={{ marginTop: 10, fontSize: lang === 'en' ? 23 : 19 }}>
                {f.star}
              </T>
              <T v="small" dim numberOfLines={2} style={{ marginTop: 2 }}>
                {f.palace ? f.palace.label : t('today.notInChart')}
              </T>
            </View>
          ))}
        </View>

        {/* where you stand in the ten-year season */}
        <T v="label" style={st.h}>
          {t('today.season')}
        </T>
        <View style={[st.season, { marginHorizontal: S.xl }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <T v="small" dim>
                {t('today.decade', { a, b })}
              </T>
              <T v="title" style={{ marginTop: 2 }}>
                {today.decade.label}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="small" dim>
                {t('today.year')}
              </T>
              <T v="heading" color={C.gold} style={{ marginTop: 2 }}>
                {today.year.label}
              </T>
            </View>
          </View>
          <View style={st.track}>
            <LinearGradient colors={[C.goldDim, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${progress * 100}%`, height: 2 }} />
            <View style={[st.knob, { left: `${progress * 100}%` }]} />
          </View>
          <View style={{ height: 16, marginTop: 8 }}>
            <T v="small" dim style={{ fontSize: 11, position: 'absolute', left: 0 }}>
              {a}
            </T>
            <T v="small" dim style={{ fontSize: 11, position: 'absolute', right: 0 }}>
              {b}
            </T>
            {progress > 0.12 && progress < 0.88 && (
              <T v="small" color={C.paper} style={{ fontSize: 11, position: 'absolute', left: `${progress * 100}%`, width: 30, marginLeft: -15, textAlign: 'center' }}>
                {today.age}
              </T>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
          <Pressable
            hitSlop={8}
            onPress={() => {
              tap();
              router.navigate('/(tabs)/chart');
            }}
            style={{ alignSelf: 'center', marginTop: S.lg }}>
            <T v="small" color={C.gold}>
              {t('chart.title')} ›
            </T>
          </Pressable>
        </View>
      </ScrollView>
      <DockAction label={t('today.askAbout')} onPress={() => ask(t('today.askPrompt', { date: dateLabel }))} />
    </Screen>
  );
}

const st = StyleSheet.create({
  h: { marginTop: S.xxl + 4, marginBottom: S.md, paddingHorizontal: S.xl },
  hair: { width: 22, height: StyleSheet.hairlineWidth, backgroundColor: C.goldDim },
  tile: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: 'rgba(23, 27, 36, 0.78)',
    padding: S.lg,
    overflow: 'hidden',
    minHeight: 112,
  },
  season: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: 'rgba(23, 27, 36, 0.78)',
    padding: S.xl,
  },
  track: { height: 2, backgroundColor: C.line, marginTop: S.xl, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.gold,
  },
});
