import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DockAction, useDockInset } from '@/components/dock';
import { BrightMeter, FLOW_COLOR, FlowBadge, StarBoard } from '@/components/star-board';
import { Card, Rule, Screen, T } from '@/components/ui';
import { buildChart, type StarView } from '@/lib/chart';
import { useStore } from '@/store';
import { C, glyphFont, S } from '@/theme';

export default function ChartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, lang, setPending } = useStore();
  const chart = useMemo(() => buildChart(profile!, lang), [profile, lang]);
  const [sel, setSel] = useState<number>(chart.soulIndex);
  const p = chart.palaces[sel];
  const opposite = chart.palaces[(sel + 6) % 12];
  const boardW = Math.min(width - 20, 460);
  const dockInset = useDockInset(true);

  const strength = (s: StarView) => (s.bright === null ? null : s.bright >= 2 ? t('chart.strong') : s.bright >= 0 ? t('chart.steady') : t('chart.quiet'));

  const ask = () => {
    setPending(t('chart.askPalacePrompt', { palace: p.label }));
    router.navigate('/(tabs)/ask');
  };

  return (
    <Screen pad={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: dockInset }}>
        <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.lg }}>
          <T v="label">{chart.zodiac} · {chart.sign}</T>
          <T v="title" style={{ marginTop: 4 }}>
            {t('chart.title')}
          </T>
        </View>

        <View style={{ alignItems: 'center' }}>
          <StarBoard chart={chart} width={boardW} selected={sel} onSelect={setSel} name={profile!.name} />
        </View>

        {/* key to the four transformation seals */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: S.md, paddingHorizontal: S.xl }}>
          {(['A', 'B', 'C', 'D'] as const).map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <FlowBadge type={k} size={13} />
              <T v="small" dim style={{ fontSize: 11 }}>
                {t(`flow.${k}`)}
              </T>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: S.xl, marginTop: S.xxl }}>
          <Text style={st.watermark}>{p.branchGlyph}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T v="display" style={{ flexShrink: 1 }}>
              {p.label}
            </T>
            <T v="small" dim>
              {p.stemGlyph}
              {p.branchGlyph} · {t('chart.decade', { a: p.decade[0], b: p.decade[1] })}
            </T>
          </View>
          <T dim style={{ marginTop: S.sm }}>
            {t(`palace.${p.key}`)}
          </T>

          <Card style={{ marginTop: S.xl }}>
            <T v="label">{t('chart.major')}</T>
            {p.major.length === 0 && (
              <T dim style={{ marginTop: S.md }}>
                {t('chart.empty', { palace: opposite.label })}
              </T>
            )}
            {(p.major.length ? p.major : opposite.major).map((s, i) => (
              <View key={s.key} style={{ marginTop: S.lg, opacity: p.major.length ? 1 : 0.7 }}>
                {i > 0 && <Rule style={{ marginBottom: S.lg }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="heading" style={{ fontSize: lang === 'en' ? 23 : 19 }}>
                    {s.label}
                  </T>
                  {s.mutagen && (
                    <>
                      <FlowBadge type={s.mutagen} size={16} />
                      <T v="small" color={FLOW_COLOR[s.mutagen]} style={{ fontSize: 11 }}>
                        {t(`flow.${s.mutagen}`)}
                      </T>
                    </>
                  )}
                  <View style={{ flex: 1 }} />
                  {s.bright !== null && (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <BrightMeter value={s.bright} />
                      <Text style={{ fontSize: 9.5, letterSpacing: 1.2, color: C.paperFaint, textTransform: 'uppercase' }}>{strength(s)}</Text>
                    </View>
                  )}
                </View>
                <T v="small" dim style={{ marginTop: 6 }}>
                  {t(`star.${s.key}`, { defaultValue: '' })}
                </T>
              </View>
            ))}
          </Card>

          {p.minor.length > 0 && (
            <Card style={{ marginTop: S.md }}>
              <T v="label">{t('chart.minor')}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: S.md }}>
                {p.minor.map((s) => (
                  <Text key={s.key} style={[st.pill, s.mutagen && { borderColor: FLOW_COLOR[s.mutagen] }]}>
                    {s.label}
                  </Text>
                ))}
              </View>
              {p.other.length > 0 && (
                <>
                  <T v="label" style={{ marginTop: S.lg }}>
                    {t('chart.other')}
                  </T>
                  <T v="small" dim style={{ marginTop: S.sm }}>
                    {p.other.join(lang === 'en' ? ' · ' : '・')}
                  </T>
                </>
              )}
            </Card>
          )}

          <Card style={{ marginTop: S.md }}>
            <T v="label">{t('chart.linked')}</T>
            <T style={{ marginTop: S.sm }}>
              {chart
                .surrounding(sel)
                .slice(1)
                .map((i) => chart.palaces[i].label)
                .join(lang === 'en' ? ' · ' : '・')}
            </T>
            <Rule style={{ marginVertical: S.lg }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                [t('chart.element'), chart.element],
                [t('chart.soulStar'), chart.soulStar],
                [t('chart.bodyStar'), chart.bodyStar],
              ].map(([k, v]) => (
                <View key={k} style={{ flex: 1 }}>
                  <T v="label">{k}</T>
                  <T v="small" style={{ marginTop: 4 }}>
                    {v}
                  </T>
                </View>
              ))}
            </View>
          </Card>

        </View>
      </ScrollView>
      <DockAction label={t('chart.askThis', { palace: p.label })} onPress={ask} />
    </Screen>
  );
}

const st = StyleSheet.create({
  watermark: {
    position: 'absolute',
    right: 12,
    top: -34,
    fontFamily: glyphFont,
    fontSize: 150,
    lineHeight: 170,
    fontWeight: '700',
    color: C.paper,
    opacity: 0.045,
  },
  pill: {
    fontSize: 13,
    color: C.paper,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 5,
    overflow: 'hidden',
  },
});
