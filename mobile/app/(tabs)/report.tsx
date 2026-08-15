import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useWeeklyReport } from '@/api/hooks';
import {
  DottedRule,
  Receipt,
  ReceiptHeader,
  ReceiptRow,
  ReceiptTotal,
  RingChart,
  Stamp,
  ViewToggle,
  useReasonColors,
} from '@/components/receipt';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { dateRange, money } from '@/format';
import { mono, useTheme } from '@/theme';

type Mode = 'items' | 'reasons' | 'days';

/**
 * Weekly report (PRD F-007) printed as a ticket. The recommendation is stamped at the top
 * because it is the one line in the product worth acting on; the evidence follows underneath.
 */
export default function Report() {
  const [weeksAgo, setWeeksAgo] = useState(1);
  const [mode, setMode] = useState<Mode>('items');
  const { data, isLoading, refetch, isRefetching } = useWeeklyReport(weeksAgo);
  const t = useTheme();
  const own = useOwnStyles();
  const reasonColor = useReasonColors();

  if (isLoading) return <Loading label="Printing your report…" />;
  if (!data) return null;

  const change = data.changePercent;
  const wasteRose = change !== undefined && change !== null && change > 0;
  const maxDay = Math.max(...data.byDay.map((d) => d.cost), 0);

  const slices = data.byReason
    .filter((slice) => slice.cost > 0)
    .map((slice) => ({
      key: slice.reason,
      label: `${slice.label}  ${money(slice.cost, data.currency)}`,
      value: slice.cost,
      color: reasonColor(slice.reason),
    }));

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />
      }>
      <Receipt torn>
        <ReceiptHeader
          title="W E E K L Y   R E P O R T"
          subtitle={dateRange(data.weekStart, data.weekEnd).toUpperCase()}
        />

        <View style={own.weekBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Earlier week"
            onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
            style={({ pressed }) => [own.step, pressed && { opacity: 0.5 }]}>
            <Text style={own.stepGlyph}>◀</Text>
          </Pressable>
          <Text style={own.weekWord}>{data.fromSnapshot ? 'CLOSED' : 'STILL OPEN'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Later week"
            onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
            disabled={weeksAgo === 0}
            style={({ pressed }) => [
              own.step,
              weeksAgo === 0 && { opacity: 0.25 },
              pressed && { opacity: 0.5 },
            ]}>
            <Text style={own.stepGlyph}>▶</Text>
          </Pressable>
        </View>

        <DottedRule />

        {data.entryCount === 0 ? (
          <EmptyState
            title="No entries that week"
            body="Weeks with nothing logged stay empty — Nokori never guesses numbers you didn't record."
          />
        ) : (
          <>
            <View style={own.stampWrap}>
              <Stamp label="DO THIS NEXT">{data.recommendation.text}</Stamp>
            </View>

            <View style={own.toggleWrap}>
              <ViewToggle
                options={[
                  { value: 'items' as const, label: 'ITEMS' },
                  { value: 'reasons' as const, label: 'REASONS' },
                  { value: 'days' as const, label: 'DAYS' },
                ]}
                value={mode}
                onChange={setMode}
              />
            </View>

            {mode === 'items' &&
              data.topItems.map((item) => (
                <ReceiptRow
                  key={item.itemId}
                  label={item.name.toUpperCase()}
                  meta={`${item.entryCount} ${item.entryCount === 1 ? 'entry' : 'entries'}`}
                  amount={money(item.cost, data.currency)}
                />
              ))}

            {mode === 'reasons' && (
              <RingChart
                slices={slices}
                centerValue={money(data.totalCost, data.currency)}
                centerLabel={`${data.entryCount} entries`}
              />
            )}

            {mode === 'days' &&
              data.byDay.map((day) => (
                <View key={day.date} style={own.dayRow}>
                  <Text style={own.dayLabel}>{day.label.slice(0, 3).toUpperCase()}</Text>
                  <View style={own.dayTrack}>
                    <View
                      style={[
                        own.dayFill,
                        { width: `${maxDay > 0 ? Math.max(2, (day.cost / maxDay) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={own.dayAmount}>{money(day.cost, data.currency)}</Text>
                </View>
              ))}

            <DottedRule />
            <ReceiptRow label="ENTRIES" amount={String(data.entryCount)} muted />
            <ReceiptRow label="TOP REASON" amount={data.topReasonLabel ?? '—'} muted />
            <ReceiptRow label="WORST DAY" amount={data.worstDay ?? '—'} muted />

            <ReceiptTotal
              label="TOTAL WASTED"
              amount={money(data.totalCost, data.currency)}
              note={
                change !== undefined && change !== null
                  ? `${wasteRose ? '▲' : '▼'} ${Math.abs(change)}% vs. ${money(data.previousTotalCost, data.currency)} the week before`
                  : 'No comparison week yet'
              }
            />

            <Text style={own.footnote}>
              {data.fromSnapshot
                ? '* WEEK CLOSED — FIGURES FROZEN AS FIRST READ'
                : '* WEEK STILL OPEN — FIGURES MOVE AS YOU LOG'}
            </Text>
          </>
        )}
      </Receipt>
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        weekBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        step: { paddingHorizontal: t.space.md, paddingVertical: 4 },
        stepGlyph: { fontFamily: mono, fontSize: 11, color: t.colors.inkMuted },
        weekWord: { fontFamily: mono, fontSize: 11, letterSpacing: 1.6, color: t.colors.inkMuted },

        stampWrap: { paddingVertical: t.space.md },
        toggleWrap: { paddingBottom: t.space.md },

        dayRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, paddingVertical: 5 },
        dayLabel: { fontFamily: mono, fontSize: 11, color: t.colors.inkMuted, width: 34 },
        dayTrack: {
          flex: 1,
          height: 10,
          backgroundColor: t.colors.surfaceSunken,
          borderRadius: 2,
          overflow: 'hidden',
        },
        dayFill: { height: 10, backgroundColor: t.colors.brand, borderRadius: 2 },
        dayAmount: {
          fontFamily: mono,
          fontSize: 11.5,
          color: t.colors.ink,
          width: 62,
          textAlign: 'right',
        },

        footnote: {
          fontFamily: mono,
          fontSize: 10,
          color: t.colors.inkFaint,
          textAlign: 'center',
          paddingTop: t.space.md,
          letterSpacing: 0.4,
        },
      }),
    [t],
  );
}
