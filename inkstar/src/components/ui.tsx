import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, type TextProps, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useStore } from '@/store';
import { C, glyphFont, S, serif } from '@/theme';

export function tap() {
  if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
}

// Fixed star field so the sky does not reshuffle between renders.
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n) * 10000;
    return x - Math.floor(x);
  };
  return { x: r(12.9898), y: r(78.233), s: 0.4 + r(37.719) * 1.1, o: 0.12 + r(4.581) * 0.5 };
});

export function Sky() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[C.ink, '#0E1118', '#131722']} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wash" cx="78%" cy="8%" rx="70%" ry="42%">
            <Stop offset="0" stopColor={C.gold} stopOpacity="0.13" />
            <Stop offset="0.5" stopColor={C.mist} stopOpacity="0.05" />
            <Stop offset="1" stopColor={C.ink} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="wash2" cx="6%" cy="92%" rx="60%" ry="36%">
            <Stop offset="0" stopColor={C.cinnabar} stopOpacity="0.09" />
            <Stop offset="1" stopColor={C.ink} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#wash)" />
        <Rect width={width} height={height} fill="url(#wash2)" />
        {STARS.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height * 0.75} r={s.s} fill={C.paper} opacity={s.o} />
        ))}
      </Svg>
    </View>
  );
}

export function Screen({ children, pad = true, top = true }: { children: ReactNode; pad?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Sky />
      <View style={{ flex: 1, paddingTop: top ? insets.top : 0, paddingHorizontal: pad ? S.xl : 0 }}>{children}</View>
    </View>
  );
}

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

export function T({ v = 'body', dim, color, style, ...rest }: TextProps & { v?: Variant; dim?: boolean; color?: string }) {
  const lang = useStore((s) => s.lang);
  const cjk = lang !== 'en';
  const base =
    v === 'display'
      ? { fontFamily: serif(lang), fontSize: cjk ? 30 : 38, lineHeight: cjk ? 42 : 42, letterSpacing: cjk ? 1 : 0.2 }
      : v === 'title'
        ? { fontFamily: serif(lang), fontSize: cjk ? 23 : 28, lineHeight: cjk ? 32 : 32 }
        : v === 'heading'
          ? { fontFamily: serif(lang, 'semibold'), fontSize: cjk ? 17 : 20, lineHeight: 26 }
          : v === 'small'
            ? { fontSize: 13, lineHeight: 19 }
            : v === 'label'
              ? { fontSize: 11, lineHeight: 15, letterSpacing: cjk ? 2 : 1.6, textTransform: 'uppercase' as const }
              : { fontSize: 16, lineHeight: cjk ? 27 : 24 };
  return (
    <Text
      {...rest}
      style={[{ color: color ?? (dim ? C.paperDim : C.paper) }, base, v === 'label' && !color && { color: C.gold }, style]}
    />
  );
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'text';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        st.btn,
        kind === 'primary' && { backgroundColor: C.paper },
        kind === 'ghost' && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.lineStrong },
        kind === 'text' && { height: 44 },
        (pressed || disabled) && { opacity: disabled ? 0.35 : 0.75 },
        style,
      ]}>
      <Text
        style={{
          fontFamily: kind === 'text' ? undefined : serif(lang, 'semibold'),
          fontSize: kind === 'text' ? 14 : lang === 'en' ? 19 : 16,
          letterSpacing: lang === 'en' ? 0.4 : 2,
          color: kind === 'primary' ? C.ink : kind === 'text' ? C.paperDim : C.paper,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Cinnabar seal stamp carrying one or two CJK glyphs. */
export function Seal({ glyph, size = 44 }: { glyph: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        backgroundColor: C.cinnabar,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-4deg' }],
      }}>
      <Text style={{ fontFamily: glyphFont, color: '#F6E9D8', fontSize: size * (glyph.length > 1 ? 0.36 : 0.56), fontWeight: '700' }}>
        {glyph}
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[st.card, style]}>{children}</View>;
}

export function Rule({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineStrong }, style]} />;
}

const st = StyleSheet.create({
  btn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl },
  card: {
    backgroundColor: 'rgba(23, 27, 36, 0.82)',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: S.xl,
  },
});
