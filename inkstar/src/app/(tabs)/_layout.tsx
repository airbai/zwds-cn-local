import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { BAR_HEIGHT, BAR_SIDE, Glass, useBarBottom } from '@/components/dock';
import { tap } from '@/components/ui';
import { useStore } from '@/store';
import { C, glyphFont } from '@/theme';

const TABS = [
  { name: 'today', glyph: '日' },
  { name: 'chart', glyph: '盤' },
  { name: 'ask', glyph: '問' },
  { name: 'me', glyph: '我' },
] as const;

const INSET = 5;

/** Floating Liquid Glass capsule; the selected tab sits in a lighter capsule that slides between items. */
function TabBar({ index, routeKeys, onTab }: { index: number; routeKeys: (string | undefined)[]; onTab: (key: string) => void }) {
  const { t } = useTranslation();
  const bottom = useBarBottom();
  const [width, setWidth] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const itemW = width > 0 ? (width - INSET * 2) / TABS.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * itemW, { damping: 18, stiffness: 190, mass: 0.7 });
  }, [index, itemW, x]);

  // The bar steps aside while typing, so the Ask input can sit right on the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (keyboard) return null;

  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom }]}>
      <Glass style={st.bar}>
        <View style={StyleSheet.absoluteFill} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} pointerEvents="none" />
        {itemW > 0 && <Animated.View pointerEvents="none" style={[st.pill, { width: itemW }, pill]} />}
        {TABS.map((tab, i) => {
          const on = index === i;
          const key = routeKeys[i];
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={t(`tabs.${tab.name}`)}
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (on || !key) return;
                tap();
                onTab(key);
              }}
              style={st.item}>
              <Text style={{ fontFamily: glyphFont, fontSize: 20, lineHeight: 24, color: on ? C.gold : C.paperDim }}>{tab.glyph}</Text>
              <Text style={{ fontSize: 10.5, letterSpacing: 0.6, marginTop: 2, color: on ? C.gold : C.paperDim, fontWeight: on ? '600' : '400' }}>
                {t(`tabs.${tab.name}`)}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.ink } }}
      tabBar={({ state, navigateToTab }) => {
        const keys = TABS.map((tab) => state.routes.find((r) => r.name === tab.name)?.key);
        const index = TABS.findIndex((tab) => tab.name === state.routes[state.index]?.name);
        return <TabBar index={index} routeKeys={keys} onTab={navigateToTab} />;
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: BAR_SIDE, right: BAR_SIDE },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
  },
  pill: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    bottom: INSET,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 230, 211, 0.12)',
  },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
