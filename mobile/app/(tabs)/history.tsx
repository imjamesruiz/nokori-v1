import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDeleteEntry, useHistory, useInventory, type HistoryFilter } from '@/api/hooks';
import { WASTE_REASONS, type WasteReason } from '@/api/types';
import { SyncBanner } from '@/components/SyncBanner';
import { Card, EmptyState, Loading, Screen, useStyles } from '@/components/ui';
import { money, quantityWithUnit, shortDate, weekdayShort } from '@/format';
import { tabular, useTheme } from '@/theme';

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

/** Waste history (PRD F-006): filters that scroll sideways, then a dense scannable list. */
export default function History() {
  const [range, setRange] = useState<Range>('week');
  const [reason, setReason] = useState<WasteReason | undefined>();
  const [itemId, setItemId] = useState<string | undefined>();
  const t = useTheme();
  const s = useStyles(t);
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
            { value: 'week', label: 'This week' },
            { value: 'lastWeek', label: 'Last week' },
            { value: 'month', label: '30 days' },
            { value: 'all', label: 'All time' },
          ]}
          value={range}
          onChange={(v) => setRange(v as Range)}
        />
        <FilterStrip
          options={[{ value: '', label: 'Any reason' }, ...WASTE_REASONS]}
          value={reason ?? ''}
          onChange={(v) => setReason(v === '' ? undefined : (v as WasteReason))}
        />
        {!!items && items.length > 0 && (
          <FilterStrip
            options={[
              { value: '', label: 'Any item' },
              ...items.map((item) => ({ value: item.id, label: item.name })),
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
        <>
          <View style={own.summary}>
            <Text style={own.summaryLabel}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
            <Text style={own.summaryValue}>{money(total)}</Text>
          </View>

          <Card>
            {entries.map((entry, index) => (
              <Pressable
                key={entry.id}
                onLongPress={() => confirmDelete(entry.id, entry.itemName)}
                style={({ pressed }) => [own.row, index > 0 && own.rowDivided, pressed && s.pressed]}>
                <View style={own.date}>
                  <Text style={own.dateDay}>{weekdayShort(entry.wasteDate)}</Text>
                  <Text style={own.dateNum}>{shortDate(entry.wasteDate)}</Text>
                </View>
                <View style={own.main}>
                  <Text style={own.name}>{entry.itemName}</Text>
                  <Text style={own.meta}>
                    {quantityWithUnit(entry.quantity, entry.unit)} · {entry.reasonLabel}
                  </Text>
                  {!!entry.note && (
                    <Text style={own.note} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  )}
                </View>
                <Text style={own.cost}>{money(entry.totalCostLost)}</Text>
              </Pressable>
            ))}
          </Card>
          <Text style={own.hint}>Long-press an entry to delete it.</Text>
        </>
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
            style={[own.pill, selected && { backgroundColor: t.colors.brand, borderColor: t.colors.brand }]}>
            <Text style={[own.pillText, selected && { color: t.colors.onBrand, fontWeight: '600' }]}>
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
          minHeight: 36,
          justifyContent: 'center',
        },
        pillText: { ...t.text.caption, color: t.colors.ink },

        summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
        summaryLabel: { ...t.text.body, color: t.colors.inkMuted },
        summaryValue: { ...t.text.title, color: t.colors.ink, ...tabular },

        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          paddingVertical: t.space.md,
        },
        rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline },
        date: {
          width: 46,
          alignItems: 'center',
          paddingVertical: t.space.xs,
          borderRadius: t.radius.sm,
          backgroundColor: t.colors.surfaceSunken,
        },
        dateDay: { ...t.text.caption, color: t.colors.inkMuted, fontWeight: '600' },
        dateNum: { ...t.text.caption, color: t.colors.inkFaint, ...tabular },
        main: { flex: 1, gap: 1 },
        name: { ...t.text.bodyStrong, color: t.colors.ink },
        meta: { ...t.text.caption, color: t.colors.inkMuted },
        note: { ...t.text.caption, color: t.colors.inkFaint, fontStyle: 'italic' },
        cost: { ...t.text.subhead, color: t.colors.ink, ...tabular },
        hint: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
      }),
    [t],
  );
}
