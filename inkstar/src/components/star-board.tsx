import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { ChartView, PalaceView, StarView } from '@/lib/chart';
import { useStore } from '@/store';
import { C, glyphFont, serif } from '@/theme';

import { tap } from './ui';

const RATIO = 1.32;
const SEAL_TEXT = '#F6E9D8';

export const FLOW_COLOR = { A: C.jade, B: C.gold, C: C.mist, D: C.cinnabar };
/** The four transformations keep their classical one-character names in every language. */
const FLOW_GLYPH = { A: '祿', B: '權', C: '科', D: '忌' };

const ELEMENT: Record<string, { glyph: string; color: string }> = {
  metal: { glyph: '金', color: '#D9CBA6' },
  wood: { glyph: '木', color: C.jade },
  water: { glyph: '水', color: C.mist },
  fire: { glyph: '火', color: '#E0705A' },
  earth: { glyph: '土', color: C.gold },
};

/** Small round seal naming a transformation. */
export function FlowBadge({ type, size = 15 }: { type: keyof typeof FLOW_COLOR; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: FLOW_COLOR[type],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: glyphFont, fontSize: size * 0.62, lineHeight: size * 0.9, color: C.ink, fontWeight: '700' }}>{FLOW_GLYPH[type]}</Text>
    </View>
  );
}

/** Seven-step scale from fallen (-3) to radiant (3), lit up to the star's brightness. */
export function BrightMeter({ value, width = 64 }: { value: number | null; width?: number }) {
  if (value === null) return null;
  const lit = value + 4; // 1..7
  const gap = 2;
  const w = (width - gap * 6) / 7;
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-end', height: 10 }}>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={{
            width: w,
            height: 3 + i,
            borderRadius: 1,
            backgroundColor: i < lit ? (value >= 2 ? C.gold : value >= 0 ? C.goldDim : C.mist) : C.line,
          }}
        />
      ))}
    </View>
  );
}

function CellDots({ value }: { value: number | null }) {
  if (value === null) return null;
  const lit = value >= 2 ? 4 : value >= 0 ? 3 : value >= -1 ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', gap: 2.5, marginTop: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: i < lit ? C.gold : C.line }} />
      ))}
    </View>
  );
}

function CellStar({ star, lang, compact }: { star: StarView; lang: string; compact: boolean }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={{ fontFamily: serif(lang, 'semibold'), fontSize: compact ? 14 : 16, lineHeight: compact ? 17 : 19, color: C.paper, flexShrink: 1 }}>
          {star.label}
        </Text>
        {star.mutagen && <FlowBadge type={star.mutagen} size={13} />}
      </View>
      <CellDots value={star.bright} />
    </View>
  );
}

/** Brushed ring in the same hand as the dial on the Today tab. */
function Enso({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const r = c - 6;
  const pt = (deg: number, rr = r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${c + rr * Math.cos(a)} ${c + rr * Math.sin(a)}`;
  };
  const sweep = (from: number, to: number, rr = r) => `M${pt(from, rr)} A${rr} ${rr} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(to, rr)}`;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Path d={sweep(210, 515)} stroke={color} strokeOpacity={0.5} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d={sweep(208, 310, r - 1)} stroke={color} strokeOpacity={0.55} strokeWidth={5.5} strokeLinecap="round" fill="none" />
      <Path d={sweep(512, 545)} stroke={color} strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="8 4 3 5 2 6" fill="none" />
    </Svg>
  );
}

function glint(x: number, y: number, r: number) {
  const w = r * 0.26;
  return `M${x} ${y - r} L${x + w} ${y - w} L${x + r} ${y} L${x + w} ${y + w} L${x} ${y + r} L${x - w} ${y + w} L${x - r} ${y} L${x - w} ${y - w} Z`;
}

export function StarBoard({
  chart,
  width,
  selected,
  onSelect,
  name,
}: {
  chart: ChartView;
  width: number;
  selected: number | null;
  onSelect: (i: number) => void;
  name: string;
}) {
  const lang = useStore((s) => s.lang);
  const inner = width - 8; // room for the double frame
  const cw = inner / 4;
  const ch = cw * RATIO;
  const height = ch * 4;
  const linked = selected === null ? [] : chart.surrounding(selected);
  const el = ELEMENT[chart.elementKey] ?? ELEMENT.earth;
  const enso = Math.min(cw * 2 - 44, ch * 2 - 120);

  /** Point on the cell edge facing the centre of the board, where the alignment lines start. */
  const anchor = (p: PalaceView) => {
    const cx = p.cell[0] * cw + cw / 2;
    const cy = p.cell[1] * ch + ch / 2;
    const dx = inner / 2 - cx;
    const dy = height / 2 - cy;
    const k = Math.min((cw / 2 - 6) / Math.abs(dx || 1e-6), (ch / 2 - 6) / Math.abs(dy || 1e-6));
    return { x: cx + dx * k, y: cy + dy * k };
  };

  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  return (
    <Animated.View style={{ opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
      <View style={[st.frameOuter, { width, height: height + 8 }]}>
        <View style={[st.frameInner, { width: inner, height }]}>
          {/* centre plate */}
          <View style={{ position: 'absolute', left: cw, top: ch, width: cw * 2, height: ch * 2, alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient colors={['rgba(203,168,105,0.10)', 'rgba(11,13,18,0)']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 1 }} />
            <View style={{ width: enso, height: enso, alignItems: 'center', justifyContent: 'center' }}>
              <Enso size={enso} color={C.paper} />
              <Text style={{ fontFamily: glyphFont, fontSize: enso * 0.46, lineHeight: enso * 0.56, color: el.color, fontWeight: '600' }}>{el.glyph}</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: serif(lang), fontSize: 22, color: C.paper, marginTop: 10, maxWidth: cw * 2 - 20 }}>
              {name}
            </Text>
            <Text style={{ fontSize: 10, color: C.gold, letterSpacing: 2, marginTop: 4 }}>{chart.element.toUpperCase()}</Text>
            <Text style={{ fontFamily: glyphFont, fontSize: 11.5, color: C.paperFaint, marginTop: 6, letterSpacing: 1 }}>{chart.pillars}</Text>
          </View>

          {/* three sides and four alignments, drawn across the centre */}
          <Svg width={inner} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {selected !== null &&
              linked.slice(1).map((i) => {
                const a = anchor(chart.palaces[selected]);
                const b = anchor(chart.palaces[i]);
                return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.gold} strokeOpacity={0.4} strokeWidth={1} />;
              })}
            {selected !== null &&
              linked.map((i, n) => {
                const a = anchor(chart.palaces[i]);
                return n === 0 ? (
                  <Circle key={`n${i}`} cx={a.x} cy={a.y} r={3} fill={C.gold} />
                ) : (
                  <Path key={`n${i}`} d={glint(a.x, a.y, 6)} fill={C.gold} />
                );
              })}
          </Svg>

          {chart.palaces.map((p) => {
            const isSel = selected === p.index;
            const isLinked = linked.includes(p.index) && !isSel;
            const isSoul = p.key === 'soul';
            return (
              <Pressable
                key={p.index}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                onPress={() => {
                  tap();
                  onSelect(p.index);
                }}
                style={[st.cell, { left: p.cell[0] * cw, top: p.cell[1] * ch, width: cw, height: ch }, isSel && { borderColor: C.gold, zIndex: 2 }]}>
                {(isSel || isLinked) && (
                  <LinearGradient
                    colors={isSel ? ['rgba(203,168,105,0.30)', 'rgba(203,168,105,0.06)'] : ['rgba(203,168,105,0.12)', 'rgba(203,168,105,0.02)']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                {/* branch watermark */}
                <Text style={[st.mark, { fontSize: cw * 0.66, lineHeight: cw * 0.74, color: isSel ? C.gold : C.paper, opacity: isSel ? 0.16 : 0.055 }]}>{p.branchGlyph}</Text>

                <View style={{ flex: 1 }}>
                  {p.major.map((s) => (
                    <CellStar key={s.key} star={s} lang={lang} compact={p.major.length > 1} />
                  ))}
                  {p.major.length === 0 && <View style={{ width: 14, height: 1, backgroundColor: C.lineStrong, marginTop: 9, marginBottom: 6 }} />}
                  <Text numberOfLines={2} style={{ fontSize: 9.5, lineHeight: 12.5, color: C.paperFaint, marginTop: 1 }}>
                    {p.minor
                      .slice(0, 2)
                      .map((s) => s.label)
                      .join(lang === 'en' ? ' · ' : ' ')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isSoul && (
                    <View style={st.soulSeal}>
                      <Text style={{ fontFamily: glyphFont, fontSize: 9, lineHeight: 12, color: SEAL_TEXT, fontWeight: '700' }}>命</Text>
                    </View>
                  )}
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{ flexShrink: 1, fontSize: 11, fontWeight: '600', color: isSoul ? '#E0705A' : C.gold, letterSpacing: lang === 'en' ? 0.4 : 1.2 }}>
                    {lang === 'en' ? p.label.toUpperCase() : p.label}
                  </Text>
                  {p.isBody && (
                    <View style={st.bodySeal}>
                      <Text style={{ fontFamily: glyphFont, fontSize: 8.5, lineHeight: 11, color: C.gold }}>身</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 9, color: C.paperFaint, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {p.decade[0]}–{p.decade[1]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  frameOuter: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameInner: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.lineStrong,
    backgroundColor: 'rgba(11, 13, 18, 0.55)',
  },
  cell: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingTop: 9,
    paddingBottom: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    backgroundColor: 'rgba(20, 24, 33, 0.82)',
    overflow: 'hidden',
  },
  mark: { position: 'absolute', right: -6, bottom: -10, fontFamily: glyphFont, fontWeight: '700' },
  soulSeal: { width: 13, height: 13, borderRadius: 3, backgroundColor: C.cinnabar, alignItems: 'center', justifyContent: 'center' },
  bodySeal: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
