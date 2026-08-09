import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Theme, tabular, useTheme } from '@/theme';

/* ------------------------------------------------------------------ layout */

export function Screen({
  children,
  scroll = true,
  refreshControl,
  padded = true,
  floatingAction,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  padded?: boolean;
  /** Pinned above the tab bar. Content gets extra bottom padding so nothing hides under it. */
  floatingAction?: React.ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(t);
  const content = [
    s.content,
    !padded && { paddingHorizontal: 0 },
    !!floatingAction && { paddingBottom: 152 },
  ];

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
      {!!floatingAction && <View style={s.floating}>{floatingAction}</View>}
    </SafeAreaView>
  );
}

/** A titled block. The label sits outside the card so the card holds only data. */
export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.section}>
      {(title || action) && (
        <View style={s.sectionHeader}>
          {!!title && <Text style={s.sectionTitle}>{title}</Text>}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = 'surface',
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: 'surface' | 'inverse' | 'sunken';
  padded?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View
      style={[
        s.card,
        tone === 'inverse' && s.cardInverse,
        tone === 'sunken' && s.cardSunken,
        padded && s.cardPadded,
        style,
      ]}>
      {children}
    </View>
  );
}

/** Rows inside a Card, separated by hairlines rather than gaps between separate cards. */
export function Row({
  label,
  value,
  meta,
  first,
  onPress,
  accent,
}: {
  label: string;
  value: string;
  meta?: string;
  first?: boolean;
  onPress?: () => void;
  accent?: 'up' | 'down' | 'none';
}) {
  const t = useTheme();
  const s = useStyles(t);
  const body = (
    <View style={[s.row, !first && s.rowDivided]}>
      <View style={s.rowMain}>
        <Text style={s.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {!!meta && (
          <Text style={s.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <Text
        style={[
          s.rowValue,
          accent === 'up' && { color: t.colors.up },
          accent === 'down' && { color: t.colors.down },
        ]}>
        {value}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && s.pressed}>
      {body}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- controls */

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  pill,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'dangerQuiet';
  size?: 'md' | 'lg';
  /** Rounds fully and hugs its label — used for the floating action. */
  pill?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const s = useStyles(t);
  const isDisabled = disabled || loading;
  const onDark = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.button,
        size === 'lg' && s.buttonLarge,
        pill && s.buttonPill,
        variant === 'primary' && s.buttonPrimary,
        variant === 'secondary' && s.buttonSecondary,
        variant === 'quiet' && s.buttonQuiet,
        variant === 'danger' && s.buttonDanger,
        variant === 'dangerQuiet' && s.buttonQuiet,
        pressed && !isDisabled && s.pressed,
        isDisabled && s.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={onDark ? t.colors.onBrand : t.colors.brand} />
      ) : (
        <Text
          style={[
            s.buttonText,
            !onDark && s.buttonTextQuiet,
            variant === 'dangerQuiet' && s.buttonTextDanger,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...inputProps
}: TextInputProps & { label?: string; hint?: string; error?: string }) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.field}>
      {!!label && <Text style={s.fieldLabel}>{label}</Text>}
      <TextInput
        placeholderTextColor={t.colors.inkFaint}
        {...inputProps}
        style={[s.input, !!error && s.inputError, inputProps.style]}
      />
      {!!hint && !error && <Text style={s.hint}>{hint}</Text>}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  columns,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.chipRow}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              s.chip,
              columns && s.chipWide,
              selected && s.chipSelected,
              pressed && s.pressed,
            ]}>
            <Text style={[s.chipText, selected && s.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ status */

export function Banner({
  tone,
  children,
  action,
}: {
  tone: 'error' | 'info' | 'success';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(t);
  const bg = { error: t.colors.upTint, info: t.colors.warningTint, success: t.colors.downTint }[tone];
  const fg = { error: t.colors.up, info: t.colors.warning, success: t.colors.down }[tone];
  return (
    <View style={[s.banner, { backgroundColor: bg }]}>
      <Text style={[s.bannerText, { color: fg }]}>{children}</Text>
      {action}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {!!action && <View style={s.emptyAction}>{action}</View>}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.loading}>
      <ActivityIndicator color={t.colors.brand} />
      {!!label && <Text style={s.loadingText}>{label}</Text>}
    </View>
  );
}

/* -------------------------------------------------------------------- data */

/** Horizontal bar for the top-items and by-reason charts. No chart library needed. */
export function BarRow({
  label,
  value,
  max,
  caption,
  tone = 'brand',
  first,
}: {
  label: string;
  value: number;
  max: number;
  caption: string;
  tone?: 'brand' | 'warning';
  first?: boolean;
}) {
  const t = useTheme();
  const s = useStyles(t);
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <View style={[s.bar, !first && s.barDivided]}>
      <View style={s.barHeader}>
        <Text style={s.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={s.barCaption}>{caption}</Text>
      </View>
      <View style={s.barTrack}>
        <View
          style={[
            s.barFill,
            { width: `${width}%` },
            tone === 'warning' && { backgroundColor: t.colors.warning },
          ]}
        />
      </View>
    </View>
  );
}

/** Label above, number below — the unit of a stat block. */
export function Metric({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta?: string;
  accent?: 'up' | 'down';
}) {
  const t = useTheme();
  const s = useStyles(t);
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text
        style={[
          s.metricValue,
          accent === 'up' && { color: t.colors.up },
          accent === 'down' && { color: t.colors.down },
        ]}
        numberOfLines={2}>
        {value}
      </Text>
      {!!meta && <Text style={s.metricMeta}>{meta}</Text>}
    </View>
  );
}

/* ------------------------------------------------------------------ styles */

export const useStyles = (t: Theme) =>
  useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: t.colors.canvas },
        content: {
          paddingHorizontal: t.space.lg,
          paddingTop: t.space.sm,
          // Clears the 64pt tab bar, which overlays the scroll rather than insetting it.
          paddingBottom: 96,
          gap: t.space.xl,
        },
        // Centred and only as wide as its label, so it obscures as little of the list as
        // possible while scrolling past it. The lift is what separates it from the content.
        floating: {
          position: 'absolute',
          alignSelf: 'center',
          bottom: t.space.xl,
          borderRadius: t.radius.pill,
          shadowColor: t.colors.shadow,
          ...t.elevation.lifted,
        },
        section: { gap: t.space.md },
        sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
        sectionTitle: { ...t.text.label, color: t.colors.inkMuted },

        card: {
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
          shadowColor: t.colors.shadow,
          ...t.elevation.card,
          overflow: 'hidden',
        },
        cardPadded: { paddingHorizontal: t.space.lg, paddingVertical: t.space.xs },
        cardInverse: { backgroundColor: t.colors.surfaceInverse, borderColor: 'transparent' },
        cardSunken: { backgroundColor: t.colors.surfaceSunken, borderColor: 'transparent' },

        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          paddingVertical: t.space.md,
          minHeight: 56,
        },
        rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
        rowMain: { flex: 1, gap: 2 },
        rowLabel: { ...t.text.bodyStrong, color: t.colors.ink },
        rowMeta: { ...t.text.caption, color: t.colors.inkMuted },
        rowValue: { ...t.text.subhead, color: t.colors.ink, ...tabular },
        pressed: { opacity: 0.6 },

        button: {
          minHeight: 50,
          borderRadius: t.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: t.space.lg,
          flexDirection: 'row',
        },
        buttonLarge: { minHeight: 56, borderRadius: t.radius.lg },
        buttonPill: { borderRadius: t.radius.pill, paddingHorizontal: t.space.xxl },
        buttonPrimary: { backgroundColor: t.colors.brand },
        buttonSecondary: { backgroundColor: t.colors.brandTint },
        buttonQuiet: { backgroundColor: 'transparent' },
        buttonDanger: { backgroundColor: t.colors.up },
        buttonDisabled: { opacity: 0.4 },
        buttonText: { ...t.text.subhead, color: t.colors.onBrand },
        buttonTextQuiet: { color: t.colors.brand },
        // Destructive actions stay reachable without being the most attractive thing on screen.
        buttonTextDanger: { color: t.colors.up },

        field: { gap: t.space.sm },
        fieldLabel: { ...t.text.label, color: t.colors.inkMuted },
        input: {
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          minHeight: 50,
          ...t.text.body,
          color: t.colors.ink,
        },
        inputError: { borderColor: t.colors.up },
        hint: { ...t.text.caption, color: t.colors.inkFaint },
        error: { ...t.text.caption, color: t.colors.up },

        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
        chip: {
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          borderRadius: t.radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          backgroundColor: t.colors.surface,
          minHeight: 44,
          justifyContent: 'center',
        },
        chipWide: { flexGrow: 1, minWidth: '47%', alignItems: 'center', minHeight: 52 },
        chipSelected: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
        chipText: { ...t.text.body, color: t.colors.ink },
        chipTextSelected: { color: t.colors.onBrand, fontWeight: '600' },

        banner: {
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          gap: t.space.sm,
        },
        bannerText: { ...t.text.body },

        empty: { alignItems: 'center', gap: t.space.sm, paddingVertical: t.space.xxl },
        emptyTitle: { ...t.text.subhead, color: t.colors.ink, textAlign: 'center' },
        emptyBody: {
          ...t.text.body,
          color: t.colors.inkMuted,
          textAlign: 'center',
          maxWidth: 280,
        },
        emptyAction: { paddingTop: t.space.sm },

        loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space.md, backgroundColor: t.colors.canvas },
        loadingText: { ...t.text.caption, color: t.colors.inkMuted },

        bar: { gap: t.space.sm, paddingVertical: t.space.md },
        barDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
        barHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: t.space.sm },
        barLabel: { ...t.text.body, color: t.colors.ink, flexShrink: 1 },
        barCaption: { ...t.text.bodyStrong, color: t.colors.inkMuted, ...tabular },
        barTrack: { height: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceSunken },
        barFill: { height: 6, borderRadius: t.radius.pill, backgroundColor: t.colors.brand },

        metric: { gap: 2, flex: 1 },
        metricLabel: { ...t.text.label, color: t.colors.inkMuted },
        // Subhead rather than heading: at heading size a value like "Over-prepped"
        // truncated inside a three-up row.
        metricValue: { ...t.text.subhead, color: t.colors.ink },
        metricMeta: { ...t.text.caption, color: t.colors.inkMuted, ...tabular },
      }),
    [t],
  );
