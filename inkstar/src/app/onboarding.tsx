import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Screen, Seal, T, tap } from '@/components/ui';
import { LANGS } from '@/i18n';
import { type Gender, HOUR_GLYPHS, HOUR_SLOTS } from '@/lib/chart';
import { useStore } from '@/store';
import { C, glyphFont, S, serif } from '@/theme';

type InputRef = React.ComponentRef<typeof TextInput>;

const STEPS = ['welcome', 'name', 'date', 'hour', 'gender', 'casting'] as const;

function validDate(y: number, m: number, d: number) {
  if (!(y >= 1900 && y <= new Date().getFullYear() && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && dt.getTime() <= Date.now();
}

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang, setLang, profile, setProfile } = useStore();
  const editing = !!profile;

  const [step, setStep] = useState(editing ? 1 : 0);
  const [name, setName] = useState(profile?.name ?? '');
  const [ymd, setYmd] = useState(() => {
    const [y, m, d] = (profile?.date ?? '--').split('-');
    return { y: y ?? '', m: m ?? '', d: d ?? '' };
  });
  const [hour, setHour] = useState<number | null>(profile ? (profile.hourKnown ? profile.hour : null) : null);
  const [hourUnknown, setHourUnknown] = useState(profile ? !profile.hourKnown : false);
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [dateError, setDateError] = useState(false);

  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [step, fade]);

  const mRef = useRef<InputRef>(null);
  const dRef = useRef<InputRef>(null);
  const key = STEPS[step];

  const finish = (g: Gender) => {
    setStep(5);
    setTimeout(() => {
      setProfile({
        name: name.trim(),
        date: `${Number(ymd.y)}-${Number(ymd.m)}-${Number(ymd.d)}`,
        hour: hourUnknown || hour === null ? 6 : hour,
        hourKnown: !hourUnknown && hour !== null,
        gender: g,
      });
      router.replace('/(tabs)/chart');
    }, 1900);
  };

  const next = () => {
    if (key === 'date') {
      if (!validDate(Number(ymd.y), Number(ymd.m), Number(ymd.d))) return setDateError(true);
      setDateError(false);
    }
    if (key === 'gender' && gender) return finish(gender);
    setStep((s) => s + 1);
  };

  const canNext =
    key === 'welcome' ||
    (key === 'name' && name.trim().length > 0) ||
    (key === 'date' && ymd.y.length === 4 && ymd.m.length > 0 && ymd.d.length > 0) ||
    (key === 'hour' && (hour !== null || hourUnknown)) ||
    (key === 'gender' && gender !== null);

  const field = (value: string, onChange: (s: string) => void, ph: string, sample: string, max: number, ref?: React.RefObject<InputRef | null>, nextRef?: React.RefObject<InputRef | null>) => (
    <View style={{ flex: max === 4 ? 1.4 : 1 }}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(s) => {
          const v = s.replace(/\D/g, '').slice(0, max);
          onChange(v);
          setDateError(false);
          if (v.length === max) nextRef?.current?.focus();
        }}
        keyboardType="number-pad"
        placeholder={sample}
        placeholderTextColor={C.paperFaint}
        selectionColor={C.gold}
        style={[st.num, { fontFamily: serif('en') }]}
      />
      <T v="label" style={{ textAlign: 'center', marginTop: 8 }}>
        {ph}
      </T>
    </View>
  );

  if (key === 'casting') {
    return (
      <Screen>
        <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
          <Seal glyph="墨星" size={84} />
          <T v="title" style={{ marginTop: S.xxl }}>
            {t('onb.casting')}
          </T>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* progress + language */}
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, marginTop: S.sm }}>
          {step > (editing ? 1 : 0) ? (
            <Pressable hitSlop={12} onPress={() => setStep((s) => s - 1)}>
              <T v="small" dim>
                ‹ {t('onb.back')}
              </T>
            </Pressable>
          ) : editing ? (
            <Pressable hitSlop={12} onPress={() => router.back()}>
              <T v="small" dim>
                ✕
              </T>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {key !== 'welcome' &&
              [1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: i === step ? 22 : 6, height: 3, borderRadius: 2, backgroundColor: i <= step ? C.gold : C.line }} />
              ))}
          </View>
          <View style={{ width: 48 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          {key === 'welcome' && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Seal glyph="墨星" size={64} />
              <Text style={{ fontFamily: serif('en'), fontSize: 20, letterSpacing: 6, color: C.gold, marginTop: S.xl }}>INKSTAR</Text>
              <T v="display" style={{ marginTop: S.lg }}>
                {t('onb.welcomeTitle')}
              </T>
              <T dim style={{ marginTop: S.lg }}>
                {t('onb.welcomeBody')}
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: S.xxl }}>
                {LANGS.map((l) => (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      tap();
                      setLang(l.code);
                    }}
                    style={[st.chip, lang === l.code && st.chipOn]}>
                    <Text style={{ color: lang === l.code ? C.paper : C.paperDim, fontSize: 13 }}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {key === 'name' && (
            <View style={{ flex: 1, paddingTop: S.xxxl }}>
              <T v="title">{t('onb.nameTitle')}</T>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('onb.namePh')}
                placeholderTextColor={C.paperFaint}
                selectionColor={C.gold}
                autoFocus
                maxLength={24}
                returnKeyType="next"
                onSubmitEditing={() => canNext && next()}
                style={[st.name, { fontFamily: serif(lang) }]}
              />
            </View>
          )}

          {key === 'date' && (
            <View style={{ flex: 1, paddingTop: S.xxxl }}>
              <T v="title">{t('onb.dateTitle')}</T>
              <T v="small" dim style={{ marginTop: S.sm }}>
                {t('onb.dateHint')}
              </T>
              <View style={{ flexDirection: 'row', gap: S.md, marginTop: S.xxl }}>
                {field(ymd.y, (y) => setYmd((v) => ({ ...v, y })), t('onb.year'), '1995', 4, undefined, mRef)}
                {field(ymd.m, (m) => setYmd((v) => ({ ...v, m })), t('onb.month'), '06', 2, mRef, dRef)}
                {field(ymd.d, (d) => setYmd((v) => ({ ...v, d })), t('onb.day'), '18', 2, dRef)}
              </View>
              {dateError && (
                <T v="small" color={C.cinnabar} style={{ marginTop: S.lg }}>
                  {t('onb.invalidDate')}
                </T>
              )}
            </View>
          )}

          {key === 'hour' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: S.xl, paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
              <T v="title">{t('onb.hourTitle')}</T>
              <T v="small" dim style={{ marginTop: S.sm }}>
                {t('onb.hourHint')}
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: S.xl }}>
                {HOUR_SLOTS.map((slot, i) => {
                  const on = hour === i && !hourUnknown;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        tap();
                        setHour(i);
                        setHourUnknown(false);
                      }}
                      style={[st.hour, on && st.chipOn]}>
                      <Text style={{ fontFamily: glyphFont, fontSize: 17, color: on ? C.gold : C.paperFaint }}>{HOUR_GLYPHS[i]}</Text>
                      <Text style={{ fontSize: 13, color: on ? C.paper : C.paperDim, fontVariant: ['tabular-nums'] }}>{slot}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => {
                  tap();
                  setHourUnknown((v) => !v);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: S.xl }}>
                <View style={[st.check, hourUnknown && { backgroundColor: C.gold, borderColor: C.gold }]} />
                <T v="small" dim={!hourUnknown}>
                  {t('onb.hourUnknown')}
                </T>
              </Pressable>
              {hourUnknown && (
                <T v="small" dim style={{ marginTop: S.sm }}>
                  {t('onb.hourUnknownNote')}
                </T>
              )}
            </ScrollView>
          )}

          {key === 'gender' && (
            <View style={{ flex: 1, paddingTop: S.xxxl }}>
              <T v="title">{t('onb.genderTitle')}</T>
              <T v="small" dim style={{ marginTop: S.sm }}>
                {t('onb.genderHint')}
              </T>
              <View style={{ flexDirection: 'row', gap: S.md, marginTop: S.xxl }}>
                {(['female', 'male'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => {
                      tap();
                      setGender(g);
                    }}
                    style={[st.gender, gender === g && st.chipOn]}>
                    <Text style={{ fontFamily: glyphFont, fontSize: 30, color: gender === g ? C.gold : C.paperFaint }}>{g === 'female' ? '陰' : '陽'}</Text>
                    <T style={{ marginTop: 8 }}>{t(`onb.${g}`)}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        <View style={{ paddingBottom: insets.bottom + S.lg }}>
          {(key === 'welcome' || key === 'gender') && (
            <T v="small" dim style={{ textAlign: 'center', marginBottom: S.lg }}>
              {t('onb.privacy')}
            </T>
          )}
          <Btn label={key === 'welcome' ? t('onb.begin') : key === 'gender' ? t('onb.reveal') : t('onb.next')} onPress={next} disabled={!canNext} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const st = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.line, justifyContent: 'center' },
  chipOn: { borderColor: C.gold, backgroundColor: 'rgba(203,168,105,0.12)' },
  name: { fontSize: 32, color: C.paper, borderBottomWidth: 1, borderBottomColor: C.lineStrong, paddingVertical: 12, marginTop: S.xxl },
  num: { fontSize: 36, color: C.paper, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: C.lineStrong, paddingVertical: 8 },
  hour: {
    width: '48.5%',
    height: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.lineStrong },
  gender: { flex: 1, height: 130, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
});
