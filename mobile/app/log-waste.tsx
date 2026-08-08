import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useInventory, useLogWaste } from '@/api/hooks';
import { WASTE_REASONS, type InventoryItem, type WasteReason } from '@/api/types';
import { Banner, Button, ChipRow, EmptyState, Loading } from '@/components/ui';
import { money, todayIso, unitLabel } from '@/format';
import { dismissModal } from '@/navigation';
import { colors, radius, spacing, type } from '@/theme';
import { uuidv4 } from '@/uuid';

/**
 * The 30-second log (PRD F-004): pick an item, tap a quantity, tap a reason, submit.
 * Everything optional is behind a disclosure so the common path stays three taps.
 */
export default function LogWaste() {
  const router = useRouter();
  const { data: items, isLoading } = useInventory();
  const logWaste = useLogWaste();

  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<WasteReason | undefined>();
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items?.find((item) => item.id === itemId) ?? null,
    [items, itemId],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = search.trim().toLowerCase();
    return needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : items;
  }, [items, search]);

  const estimatedCost =
    selectedItem && Number(quantity) > 0 ? Number(quantity) * selectedItem.costPerUnit : null;

  async function submit() {
    if (!selectedItem || !reason) return;
    setError(null);
    try {
      const entry = await logWaste.mutateAsync({
        inventoryItemId: selectedItem.id,
        quantity,
        reason,
        wasteDate: todayIso(),
        note: note.trim() || undefined,
        // Makes a retry after a dropped connection create the entry once (PRD F-012).
        clientUuid: uuidv4(),
      });
      setConfirmation(`${money(entry.totalCostLost)} logged`);
      setTimeout(() => dismissModal(router), 700);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that entry.');
    }
  }

  if (isLoading) return <Loading label="Loading your items…" />;

  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          title="No items to log yet"
          body="Add what you track — carnitas, croissants, oat milk — then logging takes seconds."
          action={
            <Button
              title="Add an item"
              variant="secondary"
              onPress={() => router.replace('/item-editor')}
            />
          }
        />
      </View>
    );
  }

  if (confirmation) {
    return (
      <View style={styles.confirmation}>
        <Text style={styles.confirmationValue}>{confirmation}</Text>
        <Text style={styles.confirmationCaption}>Saved to this week</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!!error && <Banner tone="error">{error}</Banner>}

      <Text style={styles.stepLabel}>1 · What was wasted</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search items"
        placeholderTextColor={colors.inkFaint}
        style={styles.search}
        autoCapitalize="none"
      />
      <View style={styles.itemGrid}>
        {filtered.map((item: InventoryItem) => {
          const selected = item.id === itemId;
          return (
            <Pressable
              key={item.id}
              onPress={() => setItemId(item.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.itemChip, selected && styles.itemChipSelected]}>
              <Text style={[styles.itemChipName, selected && styles.itemChipTextSelected]}>
                {item.name}
              </Text>
              <Text style={[styles.itemChipMeta, selected && styles.itemChipTextSelected]}>
                {money(item.costPerUnit)}/{unitLabel(item.unit)}
              </Text>
            </Pressable>
          );
        })}
        {filtered.length === 0 && <Text style={styles.noMatch}>No item matches "{search}".</Text>}
      </View>

      <Text style={styles.stepLabel}>
        2 · How much{selectedItem ? ` (${unitLabel(selectedItem.unit)})` : ''}
      </Text>
      <View style={styles.quantityRow}>
        <TextInput
          value={quantity}
          onChangeText={(value) => setQuantity(value.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.inkFaint}
          style={styles.quantityInput}
        />
        <View style={styles.quickRow}>
          {['1', '2', '5', '10'].map((value) => (
            <Pressable key={value} onPress={() => setQuantity(value)} style={styles.quickChip}>
              <Text style={styles.quickChipText}>{value}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.stepLabel}>3 · Why</Text>
      <ChipRow options={WASTE_REASONS} value={reason} onChange={setReason} columns />

      <Pressable onPress={() => setShowNote((value) => !value)} style={styles.disclosure}>
        <Text style={styles.disclosureText}>{showNote ? '− Hide note' : '+ Add a note'}</Text>
      </Pressable>
      {showNote && (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Slow night, event cancelled, prepped too early…"
          placeholderTextColor={colors.inkFaint}
          style={styles.note}
          multiline
        />
      )}

      {estimatedCost !== null && (
        <Text style={styles.estimate}>That's {money(estimatedCost)} of product.</Text>
      )}

      <Button
        title="Log it"
        onPress={submit}
        loading={logWaste.isPending}
        disabled={!selectedItem || !reason || !(Number(quantity) > 0)}
      />
      <Button title="Cancel" variant="ghost" onPress={() => dismissModal(router)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.mist, paddingBottom: spacing.xxl },
  emptyWrap: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.mist },
  stepLabel: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...type.body,
    color: colors.ink,
  },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: '47%',
    flexGrow: 1,
    gap: 2,
  },
  itemChipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  itemChipName: { ...type.body, color: colors.ink, fontWeight: '600' },
  itemChipMeta: { ...type.caption, color: colors.inkMuted },
  itemChipTextSelected: { color: '#fff' },
  noMatch: { ...type.body, color: colors.inkMuted },
  quantityRow: { gap: spacing.sm },
  quantityInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
  },
  quickChipText: { ...type.heading, color: colors.green },
  disclosure: { paddingVertical: spacing.sm },
  disclosureText: { ...type.body, color: colors.green, fontWeight: '600' },
  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    ...type.body,
    color: colors.ink,
  },
  estimate: { ...type.body, color: colors.inkMuted, textAlign: 'center' },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.mist },
  confirmationValue: { ...type.display, color: colors.green },
  confirmationCaption: { ...type.body, color: colors.inkMuted },
});
