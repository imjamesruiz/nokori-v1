import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useCreateBusiness } from '@/api/hooks';
import { BUSINESS_TYPES, type BusinessType } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, ChipRow, Field, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/theme';

/** Business onboarding (PRD F-002). Timezone is auto-detected and confirmable. */
export default function Setup() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const createBusiness = useCreateBusiness();

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('FOOD_TRUCK');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [seedStarterItems, setSeedStarterItems] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await createBusiness.mutateAsync({
        name: name.trim(),
        businessType,
        city: city.trim() || undefined,
        currency: 'USD',
        timezone,
        seedStarterItems,
      });
      await refreshUser();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <Screen>
      <Text style={styles.intro}>
        Your business sets the week your reports run on — Monday to Sunday in your own timezone.
      </Text>

      {!!error && <Banner tone="error">{error}</Banner>}

      <Field
        label="Business name"
        value={name}
        onChangeText={setName}
        placeholder="Sunset Taco Truck"
        autoCapitalize="words"
      />

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Business type</Text>
        <ChipRow options={BUSINESS_TYPES} value={businessType} onChange={setBusinessType} columns />
      </View>

      <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Irvine" />

      {editingTimezone ? (
        <Field
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          hint="IANA id, e.g. America/Los_Angeles"
        />
      ) : (
        <Pressable style={styles.timezoneRow} onPress={() => setEditingTimezone(true)}>
          <View>
            <Text style={styles.groupLabel}>Timezone</Text>
            <Text style={styles.timezoneValue}>{timezone}</Text>
          </View>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      )}

      <Pressable style={styles.toggleRow} onPress={() => setSeedStarterItems((value) => !value)}>
        <View style={[styles.checkbox, seedStarterItems && styles.checkboxOn]}>
          {seedStarterItems && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>Start me with common items</Text>
          <Text style={styles.toggleBody}>
            Adds a handful of typical items for your business type. Edit the costs to match yours.
          </Text>
        </View>
      </Pressable>

      <Button
        title="Start tracking"
        onPress={submit}
        loading={createBusiness.isPending}
        disabled={name.trim().length === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.inkMuted },
  group: { gap: spacing.sm },
  groupLabel: { ...type.label, color: colors.inkMuted },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  timezoneValue: { ...type.body, color: colors.ink },
  change: { ...type.body, color: colors.green, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: '#fff', fontWeight: '700' },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { ...type.body, color: colors.ink, fontWeight: '600' },
  toggleBody: { ...type.caption, color: colors.inkMuted },
});
