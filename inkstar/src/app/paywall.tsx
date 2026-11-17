import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Screen, Seal, T, tap } from '@/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/lib/api';
import {
  buy,
  FALLBACK_PLANS,
  isSubscription,
  loadPlans,
  MANAGE_SUBSCRIPTIONS_URL,
  ownedPlans,
  type Plan,
  type PlanId,
  restore,
  upgradesFrom,
} from '@/lib/purchases';
import { useStore } from '@/store';
import { C, S } from '@/theme';

export default function Paywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plus, plan: current, setOwned, grant } = useStore();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  // A subscriber sees only the plans above the one they hold; lifetime holders see none.
  const offered = upgradesFrom(current);
  const upgrading = plus && current !== null;
  const shown = plans.filter((p) => offered.includes(p.id));
  const [chosen, setPick] = useState<PlanId>('yearly');
  // Once StoreKit says what is owned, the selection falls to a plan that is still offered.
  const pick = offered.includes(chosen) ? chosen : (offered[0] ?? chosen);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    loadPlans()
      .then(setPlans)
      .catch(() => {});
    ownedPlans()
      .then((owned) => owned.length > 0 && setOwned(owned))
      .catch(() => {});
  }, [setOwned]);

  const plan = plans.find((p) => p.id === pick) ?? plans[0];

  const purchase = async () => {
    setNote(null);
    if (!plan.available) return setNote(t('pay.unavailable'));
    setBusy(true);
    try {
      if (await buy(plan)) {
        grant(plan.id);
        // StoreKit's list can lag the purchase by a moment, so keep what was just bought in it.
        ownedPlans()
          .then((owned) => setOwned([...new Set([...owned, plan.id])]))
          .catch(() => {});
        router.back();
      }
    } catch {
      setNote(t('pay.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setNote(null);
    try {
      const owned = await restore();
      if (owned.length > 0) {
        setOwned(owned);
        router.back();
      }
    } catch {
      setNote(t('pay.unavailable'));
    }
  };

  const unit = (id: PlanId) => (id === 'monthly' ? t('pay.perMonth') : id === 'yearly' ? t('pay.perYear') : t('pay.once'));

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: S.lg, paddingBottom: insets.bottom + S.xl }}>
        <Pressable hitSlop={14} onPress={() => router.back()} style={{ alignSelf: 'flex-end' }}>
          <T v="small" dim>
            {t('pay.notNow')}
          </T>
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: S.lg }}>
          <Seal glyph="墨星" size={60} />
          <T v="display" style={{ marginTop: S.lg, textAlign: 'center' }}>
            {t('pay.title')}
          </T>
          <T dim style={{ marginTop: S.sm, textAlign: 'center' }}>
            {!plus ? t('pay.sub') : upgrading && offered.length > 0 ? t('pay.current', { plan: t(`pay.${current}`) }) : t('pay.active')}
          </T>
        </View>

        <View style={{ marginTop: S.xxl, gap: S.md }}>
          {(['f1', 'f2', 'f3', 'f5'] as const).map((f) => (
            <View key={f} style={{ flexDirection: 'row', gap: S.md }}>
              <Text style={{ color: C.gold, fontSize: 13, lineHeight: 24 }}>✦</Text>
              <T style={{ flex: 1 }}>{t(`pay.${f}`)}</T>
            </View>
          ))}
        </View>

        {(!plus || (upgrading && offered.length > 0)) && (
          <>
            <View style={{ marginTop: S.xxl, gap: S.md }}>
              {shown.map((p) => {
                const on = p.id === pick;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tap();
                      setPick(p.id);
                    }}
                    style={[st.plan, on && st.planOn]}>
                    <View style={[st.radio, on && { borderColor: C.gold }]}>{on && <View style={st.dot} />}</View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T v="heading">{t(`pay.${p.id}`)}</T>
                        {p.id === 'yearly' && <Text style={st.badge}>{t('pay.best')}</Text>}
                      </View>
                      {p.id === 'yearly' && !upgrading && (
                        <T v="small" color={C.jade} style={{ marginTop: 2 }}>
                          {t('pay.trial')}
                        </T>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <T v="heading">{p.price}</T>
                      <T v="small" dim>
                        {unit(p.id)}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Btn
              label={upgrading ? t('pay.ctaUpgrade', { plan: t(`pay.${pick}`) }) : pick === 'yearly' ? t('pay.ctaTrial') : t('pay.cta')}
              onPress={purchase}
              disabled={busy}
              style={{ marginTop: S.xl }}
            />
            {pick === 'yearly' && !upgrading && (
              <T v="small" dim style={{ textAlign: 'center', marginTop: S.md }}>
                {t('pay.trialNote', { price: plan.price })}
              </T>
            )}
            {upgrading && (
              <T v="small" dim style={{ textAlign: 'center', marginTop: S.md }}>
                {pick === 'lifetime' ? t('pay.lifetimeUpgradeNote', { plan: t(`pay.${current}`) }) : t('pay.yearlyUpgradeNote')}
              </T>
            )}
            {upgrading && isSubscription(current) && (
              <Btn label={t('me.manage')} kind="text" onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)} />
            )}
            {note && (
              <T v="small" color={C.cinnabar} style={{ textAlign: 'center', marginTop: S.md }}>
                {note}
              </T>
            )}
            <Btn label={t('pay.restore')} kind="text" onPress={doRestore} style={{ marginTop: S.sm }} />
          </>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: S.xl, marginTop: S.sm }}>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(TERMS_URL)}>
            <T v="small" dim style={{ textDecorationLine: 'underline' }}>
              {t('pay.terms')}
            </T>
          </Pressable>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(PRIVACY_URL)}>
            <T v="small" dim style={{ textDecorationLine: 'underline' }}>
              {t('pay.privacy')}
            </T>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line,
    backgroundColor: 'rgba(23,27,36,0.7)',
  },
  planOn: { borderColor: C.gold, backgroundColor: 'rgba(203,168,105,0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold },
  badge: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.ink,
    backgroundColor: C.gold,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
});
