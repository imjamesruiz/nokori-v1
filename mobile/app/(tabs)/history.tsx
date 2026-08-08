import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useDeleteEntry, useHistory, useInventory, type HistoryFilter } from '@/api/hooks';
import { WASTE_REASONS, type WasteReason } from '@/api/types';
import { Card, ChipRow, EmptyState, Loading, Screen } from '@/components/ui';
import { money, quantityWithUnit, shortDate, weekdayShort } from '@/format';
import { colors, radius, spacing, type } from '@/theme';

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

/** Waste history (PRD F-006): filter chips over a flat, scannable list. */
export default function History() {
  const [range, setRange] = useState<Range>('week');
  const [reason, setReason] = useState<WasteReason | undefined>();
  const [itemId, setItemId] = useState<string | undefined>();

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
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <ChipRow
        options={[
          { value: 'week', label: 'This week' },
          { value: 'lastWeek', label: 'Last week' },
          { value: 'month', label: '30 days' },
          { value: 'all', label: 'All' },
        ]}
        value={range}
        onChange={setRange}
      />

      <ChipRow
        options={[{ value: '', label: 'Any reason' }, ...WASTE_REASONS]}
        value={reason ?? ''}
        onChange={(value) => setReason(value === '' ? undefined : (value as WasteReason))}
      />

      {!!items && items.length > 0 && (
        <ChipRow
          options={[
            { value: '', label: 'Any item' },
            ...items.map((item) => ({ value: item.id, label: item.name })),
          ]}
          value={itemId ?? ''}
          onChange={(value) => setItemId(value === '' ? undefined : value)}
        />
      )}

      {isLoading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing here" body="No entries match these filters." />
      ) : (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>

          <Card style={styles.listCard}>
            {entries.map((entry, index) => (
              <Pressable
                key={entry.id}
                onLongPress={() => confirmDelete(entry.id, entry.itemName)}
                style={[styles.row, index > 0 && styles.rowDivider]}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeDay}>{weekdayShort(entry.wasteDate)}</Text>
                  <Text style={styles.dateBadgeDate}>{shortDate(entry.wasteDate)}</Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName}>{entry.itemName}</Text>
                  <Text style={styles.rowMeta}>
                    {quantityWithUnit(entry.quantity, entry.unit)} · {entry.reasonLabel}
                  </Text>
                  {!!entry.note && <Text style={styles.rowNote}>{entry.note}</Text>}
                </View>
                <Text style={styles.rowCost}>{money(entry.totalCostLost)}</Text>
              </Pressable>
            ))}
          </Card>
          <Text style={styles.hint}>Long-press an entry to delete it.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.sm,
  },
  totalLabel: { ...type.body, color: colors.inkMuted },
  totalValue: { ...type.title, color: colors.ink },
  listCard: { gap: 0, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  dateBadge: {
    width: 52,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.mist,
  },
  dateBadgeDay: { ...type.caption, color: colors.inkMuted, textTransform: 'uppercase' },
  dateBadgeDate: { ...type.caption, color: colors.ink, fontWeight: '600' },
  rowMain: { flex: 1, gap: 2 },
  rowName: { ...type.body, color: colors.ink, fontWeight: '600' },
  rowMeta: { ...type.caption, color: colors.inkMuted },
  rowNote: { ...type.caption, color: colors.inkFaint, fontStyle: 'italic' },
  rowCost: { ...type.heading, color: colors.ink, fontVariant: ['tabular-nums'] },
  hint: { ...type.caption, color: colors.inkFaint, textAlign: 'center' },
});
