import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDeleteItem, useInventory, useSaveItem } from '@/api/hooks';
import { ITEM_CATEGORIES, ITEM_UNITS, type ItemCategory, type ItemUnit } from '@/api/types';
import { Banner, Button, ChipRow, Field } from '@/components/ui';
import { titleCase, unitLabel } from '@/format';
import { dismissModal } from '@/navigation';
import { useTheme } from '@/theme';

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((value) => ({ value, label: titleCase(value) }));
const UNIT_OPTIONS = ITEM_UNITS.map((value) => ({ value, label: unitLabel(value) }));

/** Add or edit a tracked item (PRD F-003). */
export default function ItemEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: items } = useInventory(true);
  const saveItem = useSaveItem();
  const deleteItem = useDeleteItem();
  const own = useOwnStyles();

  const existing = items?.find((item) => item.id === id);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('PREPARED');
  const [unit, setUnit] = useState<ItemUnit>('EACH');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCategory(existing.category);
    setUnit(existing.unit);
    setCostPerUnit(String(existing.costPerUnit));
  }, [existing]);

  async function submit() {
    setError(null);
    setFieldErrors({});
    try {
      await saveItem.mutateAsync({
        id: existing?.id,
        name: name.trim(),
        category,
        unit,
        costPerUnit: costPerUnit || '0',
      });
      dismissModal(router);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrors ?? {});
      } else {
        setError('Could not save that item.');
      }
    }
  }

  function confirmDelete() {
    if (!existing) return;
    const run = async () => {
      try {
        await deleteItem.mutateAsync(existing.id);
        dismissModal(router);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not remove that item.');
      }
    };

    // Alert has no web implementation; skip straight to the delete there.
    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert(
      `Remove ${existing.name}?`,
      'Past entries keep their history — the item just stops appearing when you log waste.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void run() },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={own.content} keyboardShouldPersistTaps="handled">
      {!!error && <Banner tone="error">{error}</Banner>}

      <Field
        label="Item name"
        value={name}
        onChangeText={setName}
        placeholder="Corn tortillas"
        autoCapitalize="sentences"
        error={fieldErrors.name}
      />

      <View style={own.group}>
        <Text style={own.groupLabel}>Category</Text>
        <ChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </View>

      <View style={own.group}>
        <Text style={own.groupLabel}>Unit you count it in</Text>
        <ChipRow options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
      </View>

      <Field
        label={`Cost per ${unitLabel(unit)}`}
        value={costPerUnit}
        onChangeText={(value) => setCostPerUnit(value.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="1.20"
        hint="Roughly what it costs you, not what you sell it for."
        error={fieldErrors.costPerUnit}
      />

      {!!existing && (
        <Banner tone="info">
          Changing the cost only affects future entries. Past entries keep the cost they were
          logged with.
        </Banner>
      )}

      <View style={own.actions}>
        <Button
          title={existing ? 'Save changes' : 'Add item'}
          size="lg"
          onPress={submit}
          loading={saveItem.isPending}
          disabled={name.trim().length === 0 || costPerUnit.length === 0}
        />
        {!!existing && (
          <Button
            title="Remove item"
            variant="quiet"
            onPress={confirmDelete}
            loading={deleteItem.isPending}
          />
        )}
        <Button title="Cancel" variant="quiet" onPress={() => dismissModal(router)} />
      </View>
    </ScrollView>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: t.space.lg,
          gap: t.space.xl,
          backgroundColor: t.colors.canvas,
          paddingBottom: t.space.xxxl,
        },
        group: { gap: t.space.sm },
        groupLabel: { ...t.text.label, color: t.colors.inkMuted },
        actions: { gap: t.space.sm, marginTop: t.space.sm },
      }),
    [t],
  );
}
