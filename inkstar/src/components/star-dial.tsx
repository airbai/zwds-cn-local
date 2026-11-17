import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C, glyphFont } from '@/theme';

const BRANCHES = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'woo', 'wei', 'shen', 'you', 'xu', 'hai'];
const GLYPHS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SEAL_TEXT = '#F6E9D8';

/** Clockwise angle from the top, matching the chart board: 午 at the top, 子 at the bottom. */
const angleOf = (branch: string) => (180 + BRANCHES.indexOf(branch) * 30) % 360;

const polar = (c: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
};

/** Open arc along a circle, clockwise from `from` to `to` (degrees, to > from). */
function sweep(c: number, r: number, from: number, to: number) {
  const a = polar(c, r, from);
  const b = polar(c, r, to);
  return `M${a.x} ${a.y} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** Four-pointed star glint. */
function glint(x: number, y: number, r: number) {
  const w = r * 0.26;
  return `M${x} ${y - r} L${x + w} ${y - w} L${x + r} ${y} L${x + w} ${y + w} L${x} ${y + r} L${x - w} ${y + w} L${x - r} ${y} L${x - w} ${y - w} Z`;
}

/** Fraction of the synodic month elapsed: 0 new moon, 0.5 full. */
function moonPhase(date: Date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const p = (days / 29.530588853) % 1;
  return p < 0 ? p + 1 : p;
}

/** Outline of the lit part of a moon of radius r centred on c. */
function litMoon(c: number, r: number, phase: number) {
  const waxing = phase < 0.5;
  const rx = Math.max(0.01, r * Math.abs(Math.cos(2 * Math.PI * phase)));
  const gibbous = phase > 0.25 && phase < 0.75;
  // Outer limb on the lit side, then the terminator back to the top.
  return `M${c} ${c - r} A${r} ${r} 0 0 ${waxing ? 1 : 0} ${c} ${c + r} A${rx} ${r} 0 0 ${waxing === gibbous ? 1 : 0} ${c} ${c - r} Z`;
}

// The twenty-eight lodges as fixed points of uneven brightness on a slowly turning ring.
const LODGES = Array.from({ length: 28 }, (_, i) => {
  const n = Math.sin((i + 1) * 91.7) * 10000;
  const f = n - Math.floor(n);
  return { deg: (i * 360) / 28 + (f - 0.5) * 5, r: 0.7 + f * 1.5, o: 0.28 + f * 0.6 };
});

export interface DialMark {
  branch: string;
  color: string;
}

/**
 * The day as an ink star plate: a brushed ensō rim, the twenty-eight lodges turning slowly,
 * twelve branches with a cinnabar seal on the palace the day falls in, the four currents
 * joined into a small constellation, and tonight's moon at the centre carrying the day's pillar.
 */
export function StarDial({ size, focusBranch, marks, pillar, caption }: { size: number; focusBranch: string; marks: DialMark[]; pillar: string; caption: string }) {
  const c = size / 2;
  const rRim = c - 7;
  const rLodge = c - 20;
  const rGlyph = c - 40;
  const rBand = c - 58;
  const rMarks = c - 76;
  const rMoon = c - 98;
  const focus = angleOf(focusBranch);
  const phase = moonPhase(new Date());

  const [enter] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const turning = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 240000, easing: Easing.linear, useNativeDriver: true }));
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    turning.start();
    breathing.start();
    return () => {
      turning.stop();
      breathing.stop();
    };
  }, [enter, spin, pulse]);

  // Currents sorted round the dial and fanned out where they share a palace, then joined in order.
  const stars = marks
    .map((m, i) => {
      const same = marks.filter((x) => x.branch === m.branch);
      const spread = (same.indexOf(m) - (same.length - 1) / 2) * 10;
      const deg = angleOf(m.branch) + spread;
      return { ...m, key: i, deg, ...polar(c, rMarks, deg) };
    })
    .sort((a, b) => a.deg - b.deg);

  const seal = polar(c, rGlyph, focus);
  const SEAL = 28;
  const layer = StyleSheet.absoluteFill;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* base plate: aura, brushed rim, branches, constellation, moon */}
      <Animated.View style={[layer, { opacity: enter, transform: [{ rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.gold} stopOpacity="0.2" />
              <Stop offset="0.55" stopColor={C.gold} stopOpacity="0.05" />
              <Stop offset="1" stopColor={C.ink} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="moonBody" cx="38%" cy="32%" r="80%">
              <Stop offset="0" stopColor="#2A2F3D" stopOpacity="1" />
              <Stop offset="1" stopColor="#10131A" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="moonLit" cx="50%" cy="40%" r="70%">
              <Stop offset="0" stopColor="#F3E3BF" stopOpacity="0.5" />
              <Stop offset="1" stopColor={C.gold} stopOpacity="0.2" />
            </RadialGradient>
            <LinearGradient id="spoke" x1={polar(c, rMoon, focus).x} y1={polar(c, rMoon, focus).y} x2={polar(c, rBand, focus).x} y2={polar(c, rBand, focus).y} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={C.cinnabar} stopOpacity="0" />
              <Stop offset="1" stopColor={C.cinnabar} stopOpacity="0.9" />
            </LinearGradient>
          </Defs>

          <Circle cx={c} cy={c} r={c} fill="url(#aura)" />

          {/* ensō: a heavy, wet start that thins and breaks into a dry tail */}
          <Path d={sweep(c, rRim, 205, 520)} stroke={C.paper} strokeOpacity={0.42} strokeWidth={3.2} strokeLinecap="round" fill="none" />
          <Path d={sweep(c, rRim - 1.5, 203, 318)} stroke={C.paper} strokeOpacity={0.5} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d={sweep(c, rRim + 0.5, 300, 420)} stroke={C.paper} strokeOpacity={0.22} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d={sweep(c, rRim, 518, 548)} stroke={C.paper} strokeOpacity={0.34} strokeWidth={2} strokeLinecap="round" strokeDasharray="10 4 5 5 2 6" fill="none" />
          <Path d={sweep(c, rRim - 2, 516, 540)} stroke={C.paper} strokeOpacity={0.2} strokeWidth={0.9} strokeLinecap="round" strokeDasharray="6 6 2 8" fill="none" />

          <Circle cx={c} cy={c} r={rBand} stroke={C.line} strokeWidth={1} fill="none" />
          <Path d={sweep(c, rBand, focus - 15, focus + 15)} stroke={C.gold} strokeWidth={2} strokeLinecap="round" fill="none" />

          {/* palace boundaries */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = polar(c, rBand, i * 30 + 15);
            const b = polar(c, rBand + 7, i * 30 + 15);
            return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.goldDim} strokeWidth={1} />;
          })}

          {BRANCHES.map((b, i) => {
            if (b === focusBranch) return null;
            const p = polar(c, rGlyph, angleOf(b));
            return (
              <SvgText key={b} x={p.x} y={p.y + 5} fontSize={14} fontFamily={glyphFont} fill={C.paperFaint} textAnchor="middle">
                {GLYPHS[i]}
              </SvgText>
            );
          })}

          <Line x1={polar(c, rMoon + 4, focus).x} y1={polar(c, rMoon + 4, focus).y} x2={polar(c, rBand, focus).x} y2={polar(c, rBand, focus).y} stroke="url(#spoke)" strokeWidth={1.2} />

          {/* the four currents, joined as a constellation */}
          {stars.length > 1 && (
            <Path
              d={stars.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`).join(' ') + (stars.length > 2 ? ' Z' : '')}
              stroke={C.gold}
              strokeOpacity={0.5}
              strokeWidth={0.9}
              fill={C.gold}
              fillOpacity={0.05}
            />
          )}
          {stars.map((s) => (
            <G key={s.key}>
              <Circle cx={s.x} cy={s.y} r={11} fill={s.color} opacity={0.14} />
              <Path d={glint(s.x, s.y, 7.5)} fill={s.color} />
              <Circle cx={s.x} cy={s.y} r={1.3} fill={SEAL_TEXT} />
            </G>
          ))}

          {/* tonight's moon */}
          <Circle cx={c} cy={c} r={rMoon + 9} stroke={C.goldDim} strokeWidth={0.8} strokeDasharray="1 4" fill="none" />
          <Circle cx={c} cy={c} r={rMoon} fill="url(#moonBody)" />
          <Path d={litMoon(c, rMoon, phase)} fill="url(#moonLit)" />
          <Circle cx={c} cy={c} r={rMoon} stroke={C.gold} strokeOpacity={0.55} strokeWidth={1} fill="none" />
        </Svg>
      </Animated.View>

      {/* the twenty-eight lodges, one slow turn every four minutes */}
      <Animated.View style={[layer, { opacity: enter, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={rLodge} stroke={C.line} strokeWidth={0.6} fill="none" />
          {LODGES.map((l, i) => {
            const p = polar(c, rLodge, l.deg);
            return <Circle key={i} cx={p.x} cy={p.y} r={l.r} fill={i % 7 === 0 ? C.gold : C.paper} opacity={l.o} />;
          })}
        </Svg>
      </Animated.View>

      {/* breathing glow under the seal */}
      <Animated.View style={[layer, { opacity: Animated.multiply(enter, pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })) }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.cinnabar} stopOpacity="0.6" />
              <Stop offset="1" stopColor={C.cinnabar} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={seal.x} cy={seal.y} r={40} fill="url(#sealGlow)" />
        </Svg>
      </Animated.View>

      {/* the seal on the palace the day falls in */}
      <Animated.View style={[layer, { opacity: enter, transform: [{ rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) }] }]}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-5 ${seal.x} ${seal.y})`}>
            <Rect x={seal.x - SEAL / 2} y={seal.y - SEAL / 2} width={SEAL} height={SEAL} rx={6} fill={C.cinnabar} />
            <Rect x={seal.x - SEAL / 2 + 2.5} y={seal.y - SEAL / 2 + 2.5} width={SEAL - 5} height={SEAL - 5} rx={4} stroke={SEAL_TEXT} strokeOpacity={0.35} strokeWidth={0.7} fill="none" />
            <SvgText x={seal.x} y={seal.y + 6} fontSize={17} fontFamily={glyphFont} fontWeight="700" fill={SEAL_TEXT} textAnchor="middle">
              {GLYPHS[BRANCHES.indexOf(focusBranch)]}
            </SvgText>
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={{ alignItems: 'center', opacity: enter }}>
        <Text style={[st.pillar, { fontSize: size * 0.118, lineHeight: size * 0.135 }]}>{pillar.charAt(0)}</Text>
        <Text style={[st.pillar, { fontSize: size * 0.118, lineHeight: size * 0.135 }]}>{pillar.charAt(1)}</Text>
        <Text numberOfLines={1} style={{ fontFamily: glyphFont, fontSize: 9.5, color: C.gold, letterSpacing: 0.5, marginTop: 4 }}>
          {caption}
        </Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  pillar: {
    fontFamily: glyphFont,
    color: C.paper,
    fontWeight: '600',
    textShadowColor: 'rgba(11,13,18,0.9)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
});
