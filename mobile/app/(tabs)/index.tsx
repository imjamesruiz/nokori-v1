import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError, isUnreachable } from '@/api/client';
import { useDashboard } from '@/api/hooks';
import { Banner, Button, Card, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { SyncBanner } from '@/components/SyncBanner';
import { dateRange, money, moneyShort, quantityWithUnit, shortDate } from '@/format';
import { colors, radius, spacing, type } from '@/theme';

/** Home (PRD F-005): dollars are the headline, everything else supports the decision. */
export default function Home() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const { data, isLoading, error, refetch, isRefetching } = useDashboard(weeksAgo);
  const router = useRouter();

  if (isLoading) return <Loading label="Loading your week…" />;

  // The dashboard needs the server, but logging does not. Offline, this screen still has to
  // show the pending queue and keep the Log Waste button reachable — that is the whole point
  // of the queue for a truck parked somewhere with no signal (PRD F-012).
  if (error || !data) {
    // Treat anything that is not an explicit server complaint as "offline". React Query can
    // also park a request without surfacing an error at all, and to an operator standing in a
    // parking lot the useful message is the same either way.
    const offline = !error || isUnreachable(error);
    return (
      <Screen>
        <SyncBanner />
        <Banner tone={offline ? 'info' : 'error'}>
          {offline
            ? "You're offline. Anything you log is saved on this phone and uploads when you're back."
            : error instanceof ApiError
              ? error.message
              : 'Could not load your dashboard.'}
        </Banner>
        <Button title="Log waste" onPress={() => router.push('/log-waste')} />
        <Button title="Try again" variant="secondary" onPress={() => refetch()} />
      </Screen>
    );
  }

  const currency = data.currency;
  const change = data.changePercent;

  return (
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <SyncBanner />

      <View style={styles.weekRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
          style={styles.weekArrow}>
          <Text style={styles.weekArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.weekLabel}>
          {data.isCurrentWeek ? 'This week' : dateRange(data.weekStart, data.weekEnd)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
          disabled={weeksAgo === 0}
          style={[styles.weekArrow, weeksAgo === 0 && styles.weekArrowDisabled]}>
          <Text style={styles.weekArrowText}>›</Text>
        </Pressable>
      </View>

      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>Wasted {data.isCurrentWeek ? 'so far this week' : 'that week'}</Text>
        <Text style={styles.heroValue}>{money(data.totalWasted, currency)}</Text>
        <View style={styles.heroMetaRow}>
          {change !== undefined && change !== null ? (
            <Text style={[styles.heroMeta, change > 0 ? styles.worse : styles.better]}>
              {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs. previous week
            </Text>
          ) : (
            <Text style={styles.heroMeta}>No comparison week yet</Text>
          )}
        </View>
        <Text style={styles.projection}>
          On this pace: about {moneyShort(data.projectedMonthly, currency)}/month (estimate)
        </Text>
      </Card>

      <Button title="Log waste" onPress={() => router.push('/log-waste')} />

      {data.entryCount === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Log one item — even a rough guess — and Nokori starts showing what it costs you."
        />
      ) : (
        <>
          <View style={styles.insightRow}>
            {data.topItem && (
              <Card style={styles.insightCard}>
                <Text style={styles.insightLabel}>Top item</Text>
                <Text style={styles.insightValue}>{data.topItem.name}</Text>
                <Text style={styles.insightMeta}>
                  {money(data.topItem.cost, currency)} ·{' '}
                  {quantityWithUnit(data.topItem.quantity, data.topItem.unit)}
                </Text>
              </Card>
            )}
            {data.worstDay && (
              <Card style={styles.insightCard}>
                <Text style={styles.insightLabel}>Worst day</Text>
                <Text style={styles.insightValue}>{data.worstDay.label}</Text>
                <Text style={styles.insightMeta}>{money(data.worstDay.cost, currency)}</Text>
              </Card>
            )}
          </View>

          {data.topReason && (
            <Card>
              <Text style={styles.insightLabel}>Main reason</Text>
              <Text style={styles.insightValue}>{data.topReason.label}</Text>
              <Text style={styles.insightMeta}>
                {money(data.topReason.cost, currency)} · {Math.round(data.topReason.share * 100)}% of
                this week's cost
              </Text>
            </Card>
          )}

          <SectionTitle>Recent entries</SectionTitle>
          <Card style={styles.listCard}>
            {data.recentEntries.map((entry, index) => (
              <View
                key={entry.id}
                style={[styles.entryRow, index > 0 && styles.entryRowDivider]}>
                <View style={styles.entryMain}>
                  <Text style={styles.entryName}>{entry.itemName}</Text>
                  <Text style={styles.entryMeta}>
                    {quantityWithUnit(entry.quantity, entry.unit)} · {entry.reasonLabel} ·{' '}
                    {shortDate(entry.wasteDate)}
                  </Text>
                </View>
                <Text style={styles.entryCost}>{money(entry.totalCostLost, currency)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekArrowDisabled: { opacity: 0.35 },
  weekArrowText: { fontSize: 22, color: colors.ink, lineHeight: 26 },
  weekLabel: { ...type.heading, color: colors.ink },
  heroCard: { backgroundColor: colors.green, borderColor: colors.green, gap: spacing.xs },
  heroLabel: { ...type.label, color: colors.greenSoft, textTransform: 'uppercase' },
  heroValue: { ...type.display, color: '#fff' },
  heroMetaRow: { flexDirection: 'row' },
  heroMeta: { ...type.body, color: colors.greenSoft },
  worse: { color: '#F6C9BF' },
  better: { color: '#C9E8D6' },
  projection: { ...type.caption, color: colors.greenSoft },
  insightRow: { flexDirection: 'row', gap: spacing.md },
  insightCard: { flex: 1, gap: 2 },
  insightLabel: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase' },
  insightValue: { ...type.heading, color: colors.ink },
  insightMeta: { ...type.caption, color: colors.inkMuted },
  listCard: { gap: 0, paddingVertical: spacing.xs },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  entryRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  entryMain: { flex: 1, gap: 2 },
  entryName: { ...type.body, color: colors.ink, fontWeight: '600' },
  entryMeta: { ...type.caption, color: colors.inkMuted },
  entryCost: { ...type.heading, color: colors.ink, fontVariant: ['tabular-nums'] },
});
