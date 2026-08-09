import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useCreateBusiness } from '@/api/hooks';
import { BUSINESS_TYPES, type BusinessType } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, ChipRow, Field, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

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
  const t = useTheme();
  const own = useOwnStyles();

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
      <Text style={own.intro}>
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

      <View style={own.group}>
        <Text style={own.groupLabel}>Business type</Text>
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
        <Pressable style={own.timezoneRow} onPress={() => setEditingTimezone(true)}>
          <View>
            <Text style={own.groupLabel}>Timezone</Text>
            <Text style={own.timezoneValue}>{timezone}</Text>
          </View>
          <Text style={own.change}>Change</Text>
        </Pressable>
      )}

      <Pressable style={own.toggleRow} onPress={() => setSeedStarterItems((value) => !value)}>
        <View style={[own.checkbox, seedStarterItems && own.checkboxOn]}>
          {seedStarterItems && <Text style={own.checkmark}>✓</Text>}
        </View>
        <View style={own.toggleCopy}>
          <Text style={own.toggleTitle}>Start me with common items</Text>
          <Text style={own.toggleBody}>
            Adds a handful of typical items for your business type. Edit the costs to match yours.
          </Text>
        </View>
      </Pressable>

      <Button
        size="lg"
        title="Start tracking"
        onPress={submit}
        loading={createBusiness.isPending}
        disabled={name.trim().length === 0}
      />
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        intro: { ...t.text.body, color: t.colors.inkMuted },
        group: { gap: t.space.sm },
        groupLabel: { ...t.text.label, color: t.colors.inkMuted },
        timezoneRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          minHeight: 56,
        },
        timezoneValue: { ...t.text.body, color: t.colors.ink },
        change: { ...t.text.label, color: t.colors.brand },
        toggleRow: { flexDirection: 'row', gap: t.space.md, alignItems: 'flex-start' },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: t.radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          backgroundColor: t.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        },
        checkboxOn: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
        checkmark: { color: t.colors.onBrand, fontWeight: '700', fontSize: 13 },
        toggleCopy: { flex: 1, gap: 2 },
        toggleTitle: { ...t.text.bodyStrong, color: t.colors.ink },
        toggleBody: { ...t.text.caption, color: t.colors.inkMuted },
      }),
    [t],
  );
}
