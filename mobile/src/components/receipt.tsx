import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import type { WasteReason } from '@/api/types';
import { mono, tabular, useTheme } from '@/theme';

/* ------------------------------------------------------------------ paper */

/**
 * A sheet of receipt stock. The zig-zag foot is the tear line; it only appears on the last
 * sheet of a screen, the way a real ticket only tears once.
 */
export function Receipt({
  children,
  torn,
  style,
}: {
  children: React.ReactNode;
  torn?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const s = useReceiptStyles();
  return (
    <View style={style}>
      <View style={[s.paper, torn && s.paperTorn]}>{children}</View>
      {torn && <TearEdge color={t.colors.surface} />}
    </View>
  );
}

/** Sawtooth cut, drawn rather than faked with rotated boxes so it stays crisp at any width. */
function TearEdge({ color }: { color: string }) {
  const teeth = 26;
  const step = 100 / teeth;
  let d = 'M0,0';
  for (let i = 0; i < teeth; i++) {
    d += ` L${(i + 0.5) * step},7 L${(i + 1) * step},0`;
  }
  d += ' L100,0 Z';
  return (
    <Svg width="100%" height={7} viewBox="0 0 100 7" preserveAspectRatio="none">
      <Path d={d} fill={color} />
    </Svg>
  );
}

/** Centred, letter-spaced header the way a till prints its shop name. */
export function ReceiptHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const s = useReceiptStyles();
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>{title}</Text>
      {!!subtitle && <Text style={s.headerSub}>{subtitle}</Text>}
    </View>
  );
}

export function DottedRule({ heavy }: { heavy?: boolean }) {
  const s = useReceiptStyles();
  return <View style={[s.rule, heavy && s.ruleHeavy]} />;
}

/** One printed line: description left, amount right, dot leaders between. */
export function ReceiptRow({
  label,
  amount,
  meta,
  emphasis,
  muted,
  onPress,
  onLongPress,
}: {
  label: string;
  amount: string;
  meta?: string;
  emphasis?: boolean;
  muted?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const s = useReceiptStyles();
  const body = (
    <View style={s.row}>
      <View style={s.rowMain}>
        <Text style={[s.rowLabel, emphasis && s.rowLabelStrong, muted && s.rowMuted]} numberOfLines={1}>
          {label}
        </Text>
        {!!meta && (
          <Text style={s.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <Text style={[s.rowAmount, emphasis && s.rowAmountStrong, muted && s.rowMuted]}>{amount}</Text>
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && { opacity: 0.55 }}>
      {body}
    </Pressable>
  );
}

/** The bottom line. Bigger, boxed by rules above and below, like a printed total. */
export function ReceiptTotal({ label, amount, note }: { label: string; amount: string; note?: string }) {
  const s = useReceiptStyles();
  return (
    <View style={s.totalWrap}>
      <DottedRule heavy />
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>{label}</Text>
        <Text style={s.totalAmount}>{amount}</Text>
      </View>
      {!!note && <Text style={s.totalNote}>{note}</Text>}
    </View>
  );
}

/** Rubber-stamped callout — used for the weekly recommendation. */
export function Stamp({ label, children }: { label: string; children: string }) {
  const s = useReceiptStyles();
  return (
    <View style={s.stamp}>
      <Text style={s.stampLabel}>{label}</Text>
      <Text style={s.stampText}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ chart */

export interface RingSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * "What remains" (PRD 2.1): a ring whose slices are where the money went, with a deliberate
 * gap left open. The gap is the product's namesake, and the same mark works as the app icon.
 */
export function RingChart({
  slices,
  centerValue,
  centerLabel,
  size = 208,
}: {
  slices: RingSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const t = useTheme();
  const s = useReceiptStyles();

  const stroke = 22;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  // The open gap is the motif, so the slices are laid out across the remaining 88%.
  const gap = circumference * 0.12;
  const usable = circumference - gap;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  let offset = 0;
  const arcs = slices.map((slice) => {
    const length = total > 0 ? (slice.value / total) * usable : 0;
    const arc = { ...slice, length, offset };
    offset += length;
    return arc;
  });

  return (
    <View style={s.ringWrap}>
      <Svg width={size} height={size} accessibilityRole="image"
        accessibilityLabel={`Waste by reason. Total ${centerValue}.`}>
        {/* No background track: the gap has to be real negative space, not a grey slice.
            That bite out of the ring is the "what remains" mark (PRD 2.1). */}
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(arc.length - 2, 0)} ${circumference}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </G>
        <SvgText
          x={size / 2}
          y={size / 2 + 2}
          textAnchor="middle"
          fontSize={30}
          fontWeight="700"
          fontFamily={mono}
          fill={t.colors.ink}>
          {centerValue}
        </SvgText>
        <SvgText
          x={size / 2}
          y={size / 2 + 24}
          textAnchor="middle"
          fontSize={11}
          fontFamily={mono}
          fill={t.colors.inkFaint}>
          {centerLabel}
        </SvgText>
      </Svg>

      <View style={s.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={s.legendRow}>
            <View style={[s.swatch, { backgroundColor: slice.color }]} />
            <Text style={s.legendLabel} numberOfLines={1}>
              {slice.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Two-up switch between the printed list and the ring. */
export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const s = useReceiptStyles();
  return (
    <View style={s.toggle}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[s.toggleItem, selected && s.toggleItemOn]}>
            <Text style={[s.toggleText, selected && s.toggleTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Stable colour per reason so the ring and its legend always agree. Every hue sits between
 * 20 and 90 degrees to match the paper, and the brightness values are spread so neighbouring
 * arcs stay distinguishable without relying on hue alone.
 */
export function useReasonColors() {
  const t = useTheme();
  return useMemo(() => {
    const light: Record<WasteReason, string> = {
      OVER_PREPPED: '#54682F',
      EXPIRED_SPOILED: '#B07C22',
      BURNED_DAMAGED: '#A8552F',
      TRIM_PREP: '#8C8F5C',
      CUSTOMER_RETURN: '#C9B784',
      OTHER: '#A8A492',
    };
    const dark: Record<WasteReason, string> = {
      OVER_PREPPED: '#93A860',
      EXPIRED_SPOILED: '#D6A44F',
      BURNED_DAMAGED: '#D08560',
      TRIM_PREP: '#A9AC78',
      CUSTOMER_RETURN: '#E0D3A6',
      OTHER: '#8A8676',
    };
    const map = t.scheme === 'dark' ? dark : light;
    return (reason: WasteReason) => map[reason] ?? t.colors.inkFaint;
  }, [t]);
}

/* ----------------------------------------------------------------- styles */

export function useReceiptStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        paper: {
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.sm,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
          shadowColor: t.colors.shadow,
          ...t.elevation.card,
        },
        // The tear replaces the bottom edge, so square it off and drop the border there.
        paperTorn: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },

        header: { alignItems: 'center', gap: 2, paddingBottom: t.space.md },
        headerTitle: {
          fontFamily: mono,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 2.5,
          color: t.colors.ink,
        },
        headerSub: { fontFamily: mono, fontSize: 11, letterSpacing: 1, color: t.colors.inkFaint },

        rule: { borderTopWidth: 1, borderTopColor: t.colors.hairlineStrong, borderStyle: 'dashed', marginVertical: t.space.sm },
        ruleHeavy: { borderTopWidth: 2, borderStyle: 'solid', borderTopColor: t.colors.ink },

        row: { flexDirection: 'row', alignItems: 'baseline', gap: t.space.sm, paddingVertical: 5 },
        rowMain: { flex: 1 },
        rowLabel: { fontFamily: mono, fontSize: 13, color: t.colors.ink },
        rowLabelStrong: { fontWeight: '700' },
        rowMeta: { fontFamily: mono, fontSize: 10.5, color: t.colors.inkFaint, marginTop: 1 },
        rowMuted: { color: t.colors.inkFaint },
        rowAmount: { fontFamily: mono, fontSize: 13, color: t.colors.ink, ...tabular },
        rowAmountStrong: { fontWeight: '700' },

        totalWrap: { marginTop: t.space.xs },
        totalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: t.space.sm,
        },
        totalLabel: { fontFamily: mono, fontSize: 13, fontWeight: '700', letterSpacing: 1, color: t.colors.ink },
        totalAmount: { fontFamily: mono, fontSize: 26, fontWeight: '700', color: t.colors.ink, ...tabular },
        totalNote: { fontFamily: mono, fontSize: 11, color: t.colors.inkMuted, paddingTop: 4 },

        stamp: {
          borderWidth: 2,
          borderColor: t.colors.brand,
          borderRadius: t.radius.sm,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          gap: 6,
          transform: [{ rotate: '-0.6deg' }],
        },
        stampLabel: {
          fontFamily: mono,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 2,
          color: t.colors.brand,
        },
        stampText: { ...t.text.body, fontWeight: '600', color: t.colors.ink, lineHeight: 22 },

        ringWrap: { alignItems: 'center', gap: t.space.lg, paddingVertical: t.space.sm },
        legend: { alignSelf: 'stretch', gap: 6 },
        legendRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
        swatch: { width: 9, height: 9, borderRadius: 2 },
        legendLabel: { fontFamily: mono, fontSize: 11.5, color: t.colors.inkMuted, flex: 1 },

        toggle: {
          flexDirection: 'row',
          alignSelf: 'center',
          backgroundColor: t.colors.surfaceSunken,
          borderRadius: t.radius.pill,
          padding: 3,
        },
        toggleItem: {
          paddingHorizontal: t.space.lg,
          paddingVertical: 7,
          borderRadius: t.radius.pill,
          minWidth: 92,
          alignItems: 'center',
        },
        toggleItemOn: { backgroundColor: t.colors.surface },
        toggleText: { fontFamily: mono, fontSize: 12, letterSpacing: 0.5, color: t.colors.inkMuted },
        toggleTextOn: { color: t.colors.ink, fontWeight: '700' },
      }),
    [t],
  );
}
