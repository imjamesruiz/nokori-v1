import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDeleteEntry, useHistory, useInventory, type HistoryFilter } from '@/api/hooks';
import { WASTE_REASONS, type WasteEntry, type WasteReason } from '@/api/types';
import { SyncBanner } from '@/components/SyncBanner';
import { DottedRule, Receipt, ReceiptRow, ReceiptTotal } from '@/components/receipt';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { money, quantityWithUnit, shortDate, weekdayShort } from '@/format';
import { mono, useTheme } from '@/theme';

type Range = 'week' | 'lastWeek' | 'month' | 'all';

function rangeToFilter(range: Range): Pick<HistoryFilter, 'from' | 'to'> {
  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  // Monday-anchored, matching the report weeks the owner already reads.
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  switch (range) {
    case 'week':
      return { from: iso(monday) };
    case 'lastWeek': {
      const start = new Date(monday);
      start.setDate(monday.getDate() - 7);
      const end = new Date(monday);
      end.setDate(monday.getDate() - 1);
      return { from: iso(start), to: iso(end) };
    }
    case 'month': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { from: iso(start) };
    }
    case 'all':
      return {};
  }
}

/** Waste history (PRD F-006) printed by day, the way a till roll reads back. */
export default function History() {
  const [range, setRange] = useState<Range>('week');
  const [reason, setReason] = useState<WasteReason | undefined>();
  const [itemId, setItemId] = useState<string | undefined>();
  const t = useTheme();
  const own = useOwnStyles();

  const filter = useMemo<HistoryFilter>(
    () => ({ ...rangeToFilter(range), reason, itemId }),
    [range, reason, itemId],
  );

  const { data, isLoading, refetch, isRefetching } = useHistory(filter);
  const { data: items } = useInventory(true);
  const deleteEntry = useDeleteEntry();

  const entries = data?.content ?? [];
  const total = entries.reduce((sum, entry) => sum + entry.totalCostLost, 0);

  // Entries arrive newest first; grouping preserves that order within each day.
  const days = useMemo(() => {
    const map = new Map<string, WasteEntry[]>();
    for (const entry of entries) {
      const bucket = map.get(entry.wasteDate);
      if (bucket) bucket.push(entry);
      else map.set(entry.wasteDate, [entry]);
    }
    return [...map.entries()];
  }, [entries]);

  function confirmDelete(id: string, label: string) {
    const run = () => void deleteEntry.mutateAsync(id);
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert(`Delete ${label}?`, 'This removes the entry from your totals and reports.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />
      }>
      <SyncBanner />

      {/* Horizontal scrollers keep three filter dimensions off three stacked rows. */}
      <View style={own.filters}>
        <FilterStrip
          options={[
            { value: 'week', label: 'THIS WEEK' },
            { value: 'lastWeek', label: 'LAST WEEK' },
            { value: 'month', label: '30 DAYS' },
            { value: 'all', label: 'ALL TIME' },
          ]}
          value={range}
          onChange={(v) => setRange(v as Range)}
        />
        <FilterStrip
          options={[
            { value: '', label: 'ANY REASON' },
            ...WASTE_REASONS.map((r) => ({ value: r.value as string, label: r.label.toUpperCase() })),
          ]}
          value={reason ?? ''}
          onChange={(v) => setReason(v === '' ? undefined : (v as WasteReason))}
        />
        {!!items && items.length > 0 && (
          <FilterStrip
            options={[
              { value: '', label: 'ANY ITEM' },
              ...items.map((item) => ({ value: item.id, label: item.name.toUpperCase() })),
            ]}
            value={itemId ?? ''}
            onChange={(v) => setItemId(v === '' ? undefined : v)}
          />
        )}
      </View>

      {isLoading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing here" body="No entries match these filters." />
      ) : (
        <Receipt torn>
          {days.map(([date, dayEntries], index) => (
            <View key={date}>
              {index > 0 && <DottedRule />}
              <Text style={own.dayHeader}>
                {weekdayShort(date).toUpperCase()} · {shortDate(date).toUpperCase()}
              </Text>
              {dayEntries.map((entry) => (
                <ReceiptRow
                  key={entry.id}
                  label={entry.itemName.toUpperCase()}
                  meta={`${quantityWithUnit(entry.quantity, entry.unit)} · ${entry.reasonLabel}${entry.note ? ` · ${entry.note}` : ''}`}
                  amount={money(entry.totalCostLost)}
                  onLongPress={() => confirmDelete(entry.id, entry.itemName)}
                />
              ))}
            </View>
          ))}

          <ReceiptTotal
            label={`${entries.length} ${entries.length === 1 ? 'ENTRY' : 'ENTRIES'}`}
            amount={money(total)}
          />
          <Text style={own.hint}>LONG-PRESS AN ENTRY TO DELETE</Text>
        </Receipt>
      )}
    </Screen>
  );
}

function FilterStrip({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTheme();
  const own = useOwnStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={own.strip}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value || 'any'}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              own.pill,
              selected && { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
            ]}>
            <Text
              style={[own.pillText, selected && { color: t.colors.onBrand, fontWeight: '700' }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        filters: { gap: t.space.sm, marginHorizontal: -t.space.lg },
        strip: { paddingHorizontal: t.space.lg, gap: t.space.sm },
        pill: {
          paddingHorizontal: t.space.md,
          paddingVertical: t.space.sm,
          borderRadius: t.radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairlineStrong,
          backgroundColor: t.colors.surface,
          minHeight: 34,
          justifyContent: 'center',
        },
        pillText: { fontFamily: mono, fontSize: 10.5, letterSpacing: 0.5, color: t.colors.ink },

        dayHeader: {
          fontFamily: mono,
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 1.6,
          color: t.colors.inkFaint,
          paddingTop: t.space.sm,
          paddingBottom: 2,
        },
        hint: {
          fontFamily: mono,
          fontSize: 9.5,
          letterSpacing: 0.6,
          color: t.colors.inkFaint,
          textAlign: 'center',
          paddingTop: t.space.md,
        },
      }),
    [t],
  );
}
