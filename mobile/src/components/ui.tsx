import React from 'react';
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

import { colors, radius, spacing, type } from '@/theme';

export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.green} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            (variant === 'secondary' || variant === 'ghost') && styles.buttonTextDark,
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
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        {...inputProps}
        style={[styles.input, !!error && styles.inputError, inputProps.style]}
      />
      {!!hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
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
  return (
    <View style={[styles.chipRow, columns && styles.chipGrid]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, columns && styles.chipWide, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({ tone, children }: { tone: 'error' | 'info' | 'success'; children: React.ReactNode }) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'error' && styles.bannerError,
        tone === 'info' && styles.bannerInfo,
        tone === 'success' && styles.bannerSuccess,
      ]}>
      <Text style={[styles.bannerText, tone === 'error' && styles.bannerTextError]}>{children}</Text>
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
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </Card>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

/** Horizontal bar used for the top-items and by-reason charts (no chart library needed). */
export function BarRow({
  label,
  value,
  max,
  caption,
  tone = 'green',
}: {
  label: string;
  value: number;
  max: number;
  caption: string;
  tone?: 'green' | 'amber';
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barCaption}>{caption}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${width}%` },
            tone === 'amber' && { backgroundColor: colors.amber },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase' },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.green },
  buttonSecondary: { backgroundColor: colors.greenSoft },
  buttonDanger: { backgroundColor: colors.tomato },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...type.heading, color: '#fff' },
  buttonTextDark: { color: colors.green },
  field: { gap: spacing.xs },
  fieldLabel: { ...type.label, color: colors.inkMuted },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...type.body,
    color: colors.ink,
  },
  inputError: { borderColor: colors.tomato },
  fieldHint: { ...type.caption, color: colors.inkFaint },
  fieldError: { ...type.caption, color: colors.tomato },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipGrid: { justifyContent: 'space-between' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipWide: { flexGrow: 1, minWidth: '47%', alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { ...type.body, color: colors.ink },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  banner: { borderRadius: radius.md, padding: spacing.md },
  bannerError: { backgroundColor: colors.tomatoSoft },
  bannerInfo: { backgroundColor: colors.amberSoft },
  bannerSuccess: { backgroundColor: colors.greenSoft },
  bannerText: { ...type.body, color: colors.ink },
  bannerTextError: { color: colors.tomato },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { ...type.heading, color: colors.ink, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  loading: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  loadingText: { ...type.caption, color: colors.inkMuted },
  barRow: { gap: spacing.xs },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  barLabel: { ...type.body, color: colors.ink, flexShrink: 1 },
  barCaption: { ...type.body, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.mist, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.green },
});
