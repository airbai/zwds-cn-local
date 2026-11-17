import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDockInset } from '@/components/dock';
import { Btn, Card, Rule, Screen, T, tap } from '@/components/ui';
import { LANGS } from '@/i18n';
import { PRIVACY_URL, TERMS_URL } from '@/lib/api';
import { HOUR_SLOTS } from '@/lib/chart';
import { isSubscription, MANAGE_SUBSCRIPTIONS_URL, upgradesFrom } from '@/lib/purchases';
import { useStore } from '@/store';
import { C, S } from '@/theme';

export default function Me() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, lang, setLang, plus, plan, owned, erase } = useStore();
  const dockInset = useDockInset();
  if (!profile) return null;

  const confirmErase = () =>
    Alert.alert(t('me.reset'), t('me.resetConfirm'), [
      { text: t('me.cancel'), style: 'cancel' },
      {
        text: t('me.erase'),
        style: 'destructive',
        onPress: () => {
          erase();
          router.replace('/onboarding');
        },
      },
    ]);

  return (
    <Screen pad={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: S.xl, paddingBottom: dockInset }}>
        <T v="title">{profile.name}</T>

        <T v="label" style={st.h}>
          {t('me.plan')}
        </T>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T v="heading" color={plus ? C.gold : C.paper}>
              {plus ? t('me.plus') : t('me.free')}
            </T>
            {plus && <Text style={{ color: C.gold, fontSize: 16 }}>✦</Text>}
          </View>
          {plus && plan && (
            <T v="small" dim style={{ marginTop: 4 }}>
              {t(`pay.${plan}`)}
            </T>
          )}
          {!plus && <Btn label={t('me.upgrade')} onPress={() => router.push('/paywall')} style={{ marginTop: S.lg, height: 48 }} />}
          {plus && plan && upgradesFrom(plan).length > 0 && (
            <Btn label={t('me.upgradePlan')} onPress={() => router.push('/paywall')} style={{ marginTop: S.lg, height: 48 }} />
          )}
          {plan === 'lifetime' && owned.some(isSubscription) && (
            <T v="small" color={C.cinnabar} style={{ marginTop: S.md }}>
              {t('me.stillSubscribed')}
            </T>
          )}
          {owned.some(isSubscription) && (
            <Pressable hitSlop={8} onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)} style={{ marginTop: S.md }}>
              <T v="small" color={C.gold}>
                {t('me.manage')} ›
              </T>
            </Pressable>
          )}
        </Card>

        <T v="label" style={st.h}>
          {t('me.profile')}
        </T>
        <Card>
          <T>
            {profile.date.replace(/-/g, ' / ')} · {t(`onb.${profile.gender}`)}
          </T>
          <T v="small" dim style={{ marginTop: 4 }}>
            {profile.hourKnown ? HOUR_SLOTS[profile.hour] : t('me.unknownHour')}
          </T>
          <Rule style={{ marginVertical: S.lg }} />
          <Pressable onPress={() => router.push('/onboarding')} hitSlop={8}>
            <T v="small" color={C.gold}>
              {t('me.edit')} ›
            </T>
          </Pressable>
        </Card>

        <T v="label" style={st.h}>
          {t('me.language')}
        </T>
        <Card style={{ paddingVertical: S.sm }}>
          {LANGS.map((l, i) => (
            <View key={l.code}>
              {i > 0 && <Rule />}
              <Pressable
                onPress={() => {
                  tap();
                  setLang(l.code);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>
                <T>{l.label}</T>
                {lang === l.code && <Text style={{ color: C.gold, fontSize: 16 }}>✓</Text>}
              </Pressable>
            </View>
          ))}
        </Card>

        <T v="small" dim style={{ marginTop: S.xxl }}>
          {t('me.disclaimer')}
        </T>
        <View style={{ flexDirection: 'row', gap: S.xl, marginTop: S.lg }}>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(TERMS_URL)}>
            <T v="small" color={C.gold}>
              {t('pay.terms')}
            </T>
          </Pressable>
          <Pressable hitSlop={10} onPress={() => Linking.openURL(PRIVACY_URL)}>
            <T v="small" color={C.gold}>
              {t('pay.privacy')}
            </T>
          </Pressable>
        </View>
        <Btn label={t('me.reset')} kind="text" onPress={confirmErase} style={{ marginTop: S.lg }} />
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({ h: { marginTop: S.xxl, marginBottom: S.md } });
