import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/ui';
import { C } from '@/theme';

/** Floating tab bar geometry, shared by the bar, the docked action and the screens' bottom padding. */
export const BAR_HEIGHT = 62;
export const BAR_SIDE = 16;
const ACTION_HEIGHT = 48;
const GAP = 10;

const liquid = isLiquidGlassAvailable();

/** Distance from the screen bottom to the bar's bottom edge: just above the home indicator. */
export function useBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 12, 12);
}

/** Bottom padding a tab screen needs so its last content clears the bar (and the docked action). */
export function useDockInset(withAction = false) {
  const bottom = useBarBottom();
  return bottom + BAR_HEIGHT + GAP + (withAction ? ACTION_HEIGHT + GAP : 0) + 8;
}

/** iOS 26 Liquid Glass capsule, with a quiet translucent panel where the system effect is unavailable. */
export function Glass({ children, style, tint, interactive }: { children: ReactNode; style?: ViewStyle; tint?: string; interactive?: boolean }) {
  if (liquid) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" tintColor={tint} isInteractive={interactive} style={[st.glass, style]}>
        {children}
      </GlassView>
    );
  }
  return <View style={[st.glass, st.fallback, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

/** The screen's main question, docked above the tab bar so it is always one tap away. */
export function DockAction({ label, onPress }: { label: string; onPress: () => void }) {
  const bottom = useBarBottom();
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom + BAR_HEIGHT + GAP }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], maxWidth: '86%' })}>
        <Glass tint="rgba(203, 168, 105, 0.28)" interactive style={st.action}>
          <Text style={{ color: C.gold, fontSize: 13 }}>✦</Text>
          <Text numberOfLines={1} style={st.actionText}>
            {label}
          </Text>
        </Glass>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  glass: { borderRadius: 999, overflow: 'hidden' },
  fallback: {
    backgroundColor: 'rgba(23, 27, 36, 0.92)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.lineStrong,
  },
  action: {
    height: ACTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  actionText: { color: C.paper, fontSize: 15, fontWeight: '600', letterSpacing: 0.4, flexShrink: 1 },
});
