import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useDockInset } from '@/components/dock';
import { Card, Screen, T, tap } from '@/components/ui';
import { askChart } from '@/lib/api';
import { chartFacts } from '@/lib/chart';
import { type Msg, useStore } from '@/store';
import { C, S } from '@/theme';

const id = () => Math.random().toString(36).slice(2);

export default function Ask() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, lang, plus, deviceId, thread, setThread, countQuestion, questionsLeft, pendingQuestion, setPending } = useStore();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [failed, setFailed] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // The floating tab bar hides while the keyboard is up, so the input only needs to clear it otherwise.
  const dockInset = useDockInset();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setTyping(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const left = questionsLeft();
  const locked = !plus && left <= 0;

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const s = useStore.getState();
      if (!s.plus && s.questionsLeft() <= 0) return router.push('/paywall');
      const history: Msg[] = [...s.thread, { id: id(), role: 'user', content: q }];
      setThread(history);
      setDraft('');
      setBusy(true);
      setFailed(false);
      setStreaming('');
      try {
        const answer = await askChart(
          {
            messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
            facts: chartFacts(profile!, lang),
            lang,
            deviceId,
            plus: s.plus,
          },
          setStreaming,
        );
        setThread([...history, { id: id(), role: 'assistant', content: answer }]);
        countQuestion(); // only answered questions count against the free allowance
      } catch {
        setFailed(true);
      } finally {
        setStreaming('');
        setBusy(false);
      }
    },
    [busy, countQuestion, deviceId, lang, profile, router, setThread],
  );

  // A question handed over from the Today or Chart tab is sent on arrival.
  useFocusEffect(
    useCallback(() => {
      if (pendingQuestion) {
        setPending(null);
        // The same button tapped again (same day, same palace) shows the answer already in the
        // thread instead of asking the identical question again and spending a free question.
        const asked = useStore.getState().thread.some((m) => m.role === 'user' && m.content === pendingQuestion);
        if (asked) scroll.current?.scrollToEnd({ animated: true });
        else send(pendingQuestion);
      }
    }, [pendingQuestion, send, setPending]),
  );

  const suggestions = [t('ask.s1'), t('ask.s2'), t('ask.s3'), t('ask.s4')];

  return (
    <Screen pad={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: S.md }}>
          <T v="title">{t('ask.title')}</T>
          {thread.length > 0 && !busy && (
            <Pressable
              hitSlop={10}
              onPress={() => {
                tap();
                setThread([]);
                setFailed(false);
              }}>
              <T v="small" color={C.gold}>
                {t('ask.newThread')}
              </T>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: S.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {thread.length === 0 && !busy && (
            <View style={{ marginTop: S.lg }}>
              <T dim>{t('ask.empty')}</T>
              <View style={{ marginTop: S.xl, gap: S.md }}>
                {suggestions.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => {
                      tap();
                      send(q);
                    }}>
                    <Card style={{ padding: S.lg }}>
                      <T>{q}</T>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {thread.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={st.user}>
                <Text style={{ color: C.paper, fontSize: 15, lineHeight: 22 }}>{m.content}</Text>
              </View>
            ) : (
              <View key={m.id} style={st.answer}>
                <T selectable>{m.content}</T>
              </View>
            ),
          )}

          {busy && (
            <View style={st.answer}>{streaming ? <T>{streaming}</T> : <T dim>{t('ask.thinking')}</T>}</View>
          )}
          {failed && (
            <T v="small" color={C.cinnabar} style={{ marginTop: S.lg }}>
              {t('ask.error')}
            </T>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: S.lg, paddingBottom: typing ? S.md : dockInset - 8 }}>
          {locked ? (
            <Pressable onPress={() => router.push('/paywall')} style={st.locked}>
              <T v="small" dim>
                {t('ask.limit')}
              </T>
              <T v="small" color={C.gold}>
                {t('ask.unlock')} ›
              </T>
            </Pressable>
          ) : (
            <>
              <View style={st.inputRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('ask.placeholder')}
                  placeholderTextColor={C.paperFaint}
                  selectionColor={C.gold}
                  multiline
                  maxLength={500}
                  style={st.input}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={!draft.trim() || busy}
                  onPress={() => {
                    tap();
                    send(draft);
                  }}
                  style={[st.send, (!draft.trim() || busy) && { opacity: 0.3 }]}>
                  <Text style={{ color: C.ink, fontSize: 18, fontWeight: '700' }}>↑</Text>
                </Pressable>
              </View>
              <T v="small" dim style={{ textAlign: 'center', marginTop: 8, fontSize: 11 }}>
                {plus ? t('ask.disclaimer') : t('ask.freeLeft', { n: left })}
              </T>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const st = StyleSheet.create({
  user: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: C.panelHi,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: S.xl,
  },
  answer: { marginTop: S.lg, paddingLeft: S.lg, borderLeftWidth: 1.5, borderLeftColor: C.goldDim },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: C.panel,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.line,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, color: C.paper, fontSize: 16, maxHeight: 110, paddingVertical: 8 },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  locked: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.goldDim,
    paddingHorizontal: 18,
    height: 52,
  },
});
