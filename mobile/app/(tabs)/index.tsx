import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError, isUnreachable } from '@/api/client';
import { useByReason, useDashboard, useTopItems } from '@/api/hooks';
import { SyncBanner } from '@/components/SyncBanner';
import {
  DottedRule,
  Receipt,
  ReceiptHeader,
  ReceiptRow,
  ReceiptTotal,
  RingChart,
  ViewToggle,
  useReasonColors,
  useReceiptStyles,
} from '@/components/receipt';
import { Banner, Button, EmptyState, Loading, Screen } from '@/components/ui';
import { dateRange, money, moneyShort, parseIsoDate, quantityWithUnit } from '@/format';
import { mono, useTheme } from '@/theme';

type Mode = 'receipt' | 'chart';

/** ISO week number — the "WK 32" on the header, the way a till stamps its ticket. */
function weekNumber(iso: string): number {
  const date = parseIsoDate(iso);
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7,
    )
  );
}

/**
 * Home (PRD F-005) as a printed ticket. The itemised list is the default because that is how
 * an operator already reads a total; the ring behind the toggle answers "why" rather than
 * "how much", and is the PRD 2.1 "what remains" mark doing double duty as a chart.
 */
export default function Home() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [mode, setMode] = useState<Mode>('receipt');
  const { data, isLoading, error, refetch, isRefetching } = useDashboard(weeksAgo);
  const { data: topItems } = useTopItems(weeksAgo);
  const { data: byReason } = useByReason(weeksAgo);
  const router = useRouter();
  const t = useTheme();
  const r = useReceiptStyles();
  const own = useOwnStyles();
  const reasonColor = useReasonColors();

  const logAction = <Button title="Log waste" size="lg" pill onPress={() => router.push('/log-waste')} />;

  if (isLoading) return <Loading label="Printing your week…" />;

  // The dashboard needs the server, but logging does not. Offline this screen still has to show
  // the pending queue and keep logging reachable — the whole point of the queue (PRD F-012).
  if (error || !data) {
    const offline = !error || isUnreachable(error);
    return (
      <Screen floatingAction={logAction}>
        <SyncBanner />
        <Banner tone={offline ? 'info' : 'error'}>
          {offline
            ? "You're offline. Anything you log is saved on this phone and uploads when you're back."
            : error instanceof ApiError
              ? error.message
              : 'Could not load your dashboard.'}
        </Banner>
        <Button title="Try again" variant="secondary" onPress={() => refetch()} />
      </Screen>
    );
  }

  const currency = data.currency;
  const change = data.changePercent;
  const wasteRose = change !== undefined && change !== null && change > 0;

  const slices = (byReason ?? [])
    .filter((slice) => slice.cost > 0)
    .map((slice) => ({
      key: slice.reason,
      label: `${slice.label}  ${money(slice.cost, currency)}`,
      value: slice.cost,
      color: reasonColor(slice.reason),
    }));

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />
      }
      floatingAction={logAction}>
      <SyncBanner />

      <Receipt torn>
        <ReceiptHeader
          title="N O K O R I"
          subtitle={`WK ${weekNumber(data.weekStart)} · ${dateRange(data.weekStart, data.weekEnd).toUpperCase()}`}
        />

        <View style={own.weekBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
            style={({ pressed }) => [own.step, pressed && { opacity: 0.5 }]}>
            <Text style={own.stepGlyph}>◀</Text>
          </Pressable>
          <Text style={own.weekWord}>{data.isCurrentWeek ? 'THIS WEEK' : 'PAST WEEK'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
            disabled={weeksAgo === 0}
            style={({ pressed }) => [own.step, weeksAgo === 0 && { opacity: 0.25 }, pressed && { opacity: 0.5 }]}>
            <Text style={own.stepGlyph}>▶</Text>
          </Pressable>
        </View>

        <DottedRule />

        {data.entryCount === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            body="Log one item — even a rough guess — and Nokori starts printing what it costs you."
          />
        ) : (
          <>
            <View style={own.toggleWrap}>
              <ViewToggle
                options={[
                  { value: 'receipt' as const, label: 'ITEMS' },
                  { value: 'chart' as const, label: 'REASONS' },
                ]}
                value={mode}
                onChange={setMode}
              />
            </View>

            {mode === 'receipt' ? (
              <>
                {(topItems ?? []).map((item) => (
                  <ReceiptRow
                    key={item.itemId}
                    label={item.name.toUpperCase()}
                    meta={quantityWithUnit(item.quantity, item.unit)}
                    amount={money(item.cost, currency)}
                  />
                ))}
                <DottedRule />
                {!!data.worstDay && (
                  <ReceiptRow
                    label="WORST DAY"
                    amount={data.worstDay.label}
                    muted
                  />
                )}
                {!!data.topReason && (
                  <ReceiptRow
                    label="MAIN REASON"
                    amount={`${data.topReason.label} ${Math.round(data.topReason.share * 100)}%`}
                    muted
                  />
                )}
                <ReceiptRow label="ENTRIES" amount={String(data.entryCount)} muted />
              </>
            ) : (
              <RingChart
                slices={slices}
                centerValue={money(data.totalWasted, currency)}
                centerLabel={`${data.entryCount} entries`}
              />
            )}

            <ReceiptTotal
              label="TOTAL WASTED"
              amount={money(data.totalWasted, currency)}
              note={
                change !== undefined && change !== null
                  ? `${wasteRose ? '▲' : '▼'} ${Math.abs(change)}% vs. previous week`
                  : 'No comparison week yet'
              }
            />
            <Text style={[r.rowMeta, own.pace]}>
              ON THIS PACE ≈ {moneyShort(data.projectedMonthly, currency)}/MONTH
            </Text>
          </>
        )}
      </Receipt>

      {data.recentEntries.length > 0 && (
        <Receipt>
          <Text style={own.sheetTitle}>RECENT</Text>
          <DottedRule />
          {data.recentEntries.map((entry) => (
            <ReceiptRow
              key={entry.id}
              label={entry.itemName.toUpperCase()}
              meta={`${quantityWithUnit(entry.quantity, entry.unit)} · ${entry.reasonLabel}`}
              amount={money(entry.totalCostLost, currency)}
            />
          ))}
          <DottedRule />
          <Pressable accessibilityRole="button" onPress={() => router.push('/history')}>
            <Text style={own.seeAll}>SEE ALL ENTRIES ▸</Text>
          </Pressable>
        </Receipt>
      )}
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
        toggleWrap: { paddingVertical: t.space.sm },
        pace: { textAlign: 'center', paddingTop: t.space.sm, letterSpacing: 0.5 },
        sheetTitle: {
          fontFamily: mono,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 2,
          color: t.colors.inkMuted,
          textAlign: 'center',
        },
        seeAll: {
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: 1.2,
          color: t.colors.brand,
          textAlign: 'center',
          paddingVertical: 4,
        },
      }),
    [t],
  );
}
