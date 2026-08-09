import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useInventory, useLogWaste } from '@/api/hooks';
import { WASTE_REASONS, type InventoryItem, type WasteReason } from '@/api/types';
import { Banner, Button, EmptyState, Loading, useStyles } from '@/components/ui';
import { money, todayIso, unitLabel } from '@/format';
import { dismissModal } from '@/navigation';
import { tabular, useTheme } from '@/theme';
import { uuidv4 } from '@/uuid';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

/**
 * The 30-second log (PRD F-004). Three decisions, each on its own step, each with tap targets
 * big enough for someone holding a phone in one hand in a hot kitchen.
 *
 * Quantity uses an in-screen keypad rather than the OS keyboard: it never covers the reason
 * buttons, never shifts the layout, and keeps the whole flow on one screen.
 */
export default function LogWaste() {
  const router = useRouter();
  const { data: items, isPending } = useInventory();
  const logWaste = useLogWaste();
  const t = useTheme();
  const s = useStyles(t);
  const own = useOwnStyles();

  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<WasteReason | undefined>();
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ amount: string; queuedOffline: boolean } | null>(
    null,
  );

  const selectedItem = useMemo(() => items?.find((i) => i.id === itemId) ?? null, [items, itemId]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = search.trim().toLowerCase();
    return needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items;
  }, [items, search]);

  const numericQuantity = Number(quantity);
  const estimatedCost =
    selectedItem && numericQuantity > 0 ? numericQuantity * selectedItem.costPerUnit : null;
  const ready = !!selectedItem && !!reason && numericQuantity > 0;

  function press(key: string) {
    setQuantity((current) => {
      if (key === '⌫') return current.slice(0, -1);
      if (key === '.' && current.includes('.')) return current;
      if (key === '.' && current === '') return '0.';
      // Three decimals is the column width the server stores.
      if (current.includes('.') && current.split('.')[1].length >= 3) return current;
      if (current.replace('.', '').length >= 6) return current;
      return current + key;
    });
  }

  async function submit() {
    if (!selectedItem || !reason) return;
    setError(null);
    try {
      const result = await logWaste.mutateAsync({
        item: selectedItem,
        quantity,
        reason,
        wasteDate: todayIso(),
        note: note.trim() || undefined,
        // Makes a retry after a dropped connection create the entry once (PRD F-012).
        clientUuid: uuidv4(),
      });
      setConfirmation({
        amount: money(result.entry.totalCostLost),
        queuedOffline: result.queuedOffline,
      });
      setTimeout(() => dismissModal(router), 1100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that entry.');
    }
  }

  if (isPending) return <Loading label="Loading your items…" />;

  if (!items || items.length === 0) {
    return (
      <View style={own.centered}>
        <EmptyState
          title="No items to log yet"
          body="Add what you track — carnitas, croissants, oat milk — then logging takes seconds."
          action={
            <Button title="Add an item" variant="secondary" onPress={() => router.replace('/item-editor')} />
          }
        />
      </View>
    );
  }

  if (confirmation) {
    return (
      <View style={own.centered}>
        <View style={own.confirmMark}>
          <Text style={own.confirmTick}>✓</Text>
        </View>
        <Text style={own.confirmValue}>{confirmation.amount}</Text>
        <Text style={own.confirmCaption}>
          {confirmation.queuedOffline
            ? "Saved on this phone — it'll upload when you're back online"
            : 'Logged to this week'}
        </Text>
      </View>
    );
  }

  return (
    <View style={own.wrap}>
      <ScrollView
        contentContainerStyle={own.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!!error && <Banner tone="error">{error}</Banner>}

        <Step index={1} title="What was wasted" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search items"
          placeholderTextColor={t.colors.inkFaint}
          style={own.search}
          autoCapitalize="none"
        />
        <View style={own.itemGrid}>
          {filtered.map((item: InventoryItem) => {
            const selected = item.id === itemId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setItemId(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [own.item, selected && own.itemOn, pressed && s.pressed]}>
                <Text style={[own.itemName, selected && own.itemTextOn]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[own.itemMeta, selected && own.itemMetaOn]}>
                  {money(item.costPerUnit)}/{unitLabel(item.unit)}
                </Text>
              </Pressable>
            );
          })}
          {filtered.length === 0 && <Text style={own.noMatch}>No item matches “{search}”.</Text>}
        </View>

        <Step
          index={2}
          title="How much"
          hint={selectedItem ? `in ${unitLabel(selectedItem.unit)}` : undefined}
        />
        <View style={own.readout}>
          <Text style={[own.readoutValue, !quantity && own.readoutEmpty]}>{quantity || '0'}</Text>
          {!!selectedItem && <Text style={own.readoutUnit}>{unitLabel(selectedItem.unit)}</Text>}
        </View>
        <View style={own.keypad}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key}
              onPress={() => press(key)}
              style={({ pressed }) => [own.key, pressed && own.keyPressed]}>
              <Text style={own.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>

        <Step index={3} title="Why" />
        <View style={own.reasonGrid}>
          {WASTE_REASONS.map((option) => {
            const selected = option.value === reason;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setReason(option.value)}
                style={({ pressed }) => [own.reason, selected && own.reasonOn, pressed && s.pressed]}>
                <Text style={[own.reasonText, selected && own.itemTextOn]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => setShowNote((v) => !v)} style={own.disclosure}>
          <Text style={own.disclosureText}>{showNote ? '− Hide note' : '+ Add a note'}</Text>
        </Pressable>
        {showNote && (
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Slow night, event cancelled, prepped too early…"
            placeholderTextColor={t.colors.inkFaint}
            style={own.note}
            multiline
          />
        )}
      </ScrollView>

      {/* Docked so the running total and the action are always visible while choosing. */}
      <View style={own.dock}>
        {estimatedCost !== null && (
          <View style={own.dockTotal}>
            <Text style={own.dockTotalLabel}>That's</Text>
            <Text style={own.dockTotalValue}>{money(estimatedCost)}</Text>
            <Text style={own.dockTotalLabel}>of product</Text>
          </View>
        )}
        <Button
          title="Log it"
          size="lg"
          onPress={submit}
          loading={logWaste.isPending}
          disabled={!ready}
        />
      </View>
    </View>
  );
}

function Step({ index, title, hint }: { index: number; title: string; hint?: string }) {
  const own = useOwnStyles();
  return (
    <View style={own.step}>
      <View style={own.stepBadge}>
        <Text style={own.stepBadgeText}>{index}</Text>
      </View>
      <Text style={own.stepTitle}>{title}</Text>
      {!!hint && <Text style={own.stepHint}>{hint}</Text>}
    </View>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        wrap: { flex: 1, backgroundColor: t.colors.canvas },
        scroll: {
          paddingHorizontal: t.space.lg,
          paddingTop: t.space.lg,
          paddingBottom: t.space.xxxl * 2.6,
          gap: t.space.md,
        },
        centered: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.sm,
          padding: t.space.lg,
          backgroundColor: t.colors.canvas,
        },

        step: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.lg },
        stepBadge: {
          width: 20,
          height: 20,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.brandTint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        stepBadgeText: { ...t.text.caption, fontWeight: '700', color: t.colors.brand },
        stepTitle: { ...t.text.subhead, color: t.colors.ink },
        stepHint: { ...t.text.caption, color: t.colors.inkFaint },

        search: {
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          minHeight: 46,
          ...t.text.body,
          color: t.colors.ink,
        },
        itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
        item: {
          // flexBasis rather than minWidth: with minWidth the longer labels claimed a wider
          // base and the two columns came out ragged.
          flexBasis: '47%',
          flexGrow: 1,
          gap: 2,
          paddingHorizontal: t.space.md,
          paddingVertical: t.space.md,
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
        },
        itemOn: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
        itemName: { ...t.text.bodyStrong, color: t.colors.ink },
        itemMeta: { ...t.text.caption, color: t.colors.inkMuted, ...tabular },
        itemTextOn: { color: t.colors.onBrand },
        itemMetaOn: { color: t.colors.onBrandMuted },
        noMatch: { ...t.text.body, color: t.colors.inkMuted, paddingVertical: t.space.sm },

        readout: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: t.space.sm,
          paddingVertical: t.space.sm,
        },
        readoutValue: { ...t.text.display, color: t.colors.ink, ...tabular },
        readoutEmpty: { color: t.colors.inkFaint },
        readoutUnit: { ...t.text.subhead, color: t.colors.inkMuted },

        keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
        key: {
          width: '31.5%',
          flexGrow: 1,
          height: 54,
          borderRadius: t.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
        },
        keyPressed: { backgroundColor: t.colors.brandTint },
        keyText: { ...t.text.title, fontWeight: '600', color: t.colors.ink, ...tabular },

        reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
        reason: {
          flexBasis: '47%',
          flexGrow: 1,
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: t.space.md,
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
        },
        reasonOn: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
        reasonText: { ...t.text.body, color: t.colors.ink, textAlign: 'center' },

        disclosure: { paddingVertical: t.space.md, alignSelf: 'flex-start' },
        disclosureText: { ...t.text.bodyStrong, color: t.colors.brand },
        note: {
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          borderRadius: t.radius.md,
          padding: t.space.lg,
          minHeight: 88,
          textAlignVertical: 'top',
          ...t.text.body,
          color: t.colors.ink,
        },

        dock: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: t.space.lg,
          paddingTop: t.space.md,
          paddingBottom: t.space.xl,
          gap: t.space.sm,
          backgroundColor: t.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.colors.hairline,
          shadowColor: t.colors.shadow,
          ...t.elevation.lifted,
        },
        dockTotal: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
        dockTotalLabel: { ...t.text.caption, color: t.colors.inkMuted },
        dockTotalValue: { ...t.text.heading, color: t.colors.ink, ...tabular },

        confirmMark: {
          width: 56,
          height: 56,
          borderRadius: t.radius.pill,
          backgroundColor: t.colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: t.space.sm,
        },
        confirmTick: { fontSize: 28, lineHeight: 34, color: t.colors.onBrand, fontWeight: '700' },
        confirmValue: { ...t.text.display, color: t.colors.ink, ...tabular },
        confirmCaption: { ...t.text.body, color: t.colors.inkMuted, textAlign: 'center' },
      }),
    [t],
  );
}
