import React, { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useWeeklyReport } from '@/api/hooks';
import { BarRow, Button, Card, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { dateRange, money } from '@/format';
import { colors, spacing, type } from '@/theme';

/** Weekly report (PRD F-007): one recommendation at the top, evidence underneath. */
export default function Report() {
  const [weeksAgo, setWeeksAgo] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useWeeklyReport(weeksAgo);

  if (isLoading) return <Loading label="Building your report…" />;
  if (!data) return null;

  const maxItemCost = Math.max(...data.topItems.map((item) => item.cost), 0);
  const maxDayCost = Math.max(...data.byDay.map((day) => day.cost), 0);
  const change = data.changePercent;

  return (
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <View style={styles.weekRow}>
        <Button
          title="‹ Earlier"
          variant="ghost"
          onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
          style={styles.weekButton}
        />
        <Text style={styles.weekLabel}>{dateRange(data.weekStart, data.weekEnd)}</Text>
        <Button
          title="Later ›"
          variant="ghost"
          onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
          disabled={weeksAgo === 0}
          style={styles.weekButton}
        />
      </View>

      {data.entryCount === 0 ? (
        <EmptyState
          title="No entries that week"
          body="Weeks with nothing logged stay empty — Nokori never guesses numbers you didn't record."
        />
      ) : (
        <>
          <Card style={styles.recommendationCard}>
            <Text style={styles.recommendationLabel}>Do this next</Text>
            <Text style={styles.recommendationText}>{data.recommendation.text}</Text>
          </Card>

          <Card>
            <Text style={styles.totalLabel}>Total wasted</Text>
            <Text style={styles.totalValue}>{money(data.totalCost, data.currency)}</Text>
            {change !== undefined && change !== null ? (
              <Text style={[styles.change, change > 0 ? styles.worse : styles.better]}>
                {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs. the week before (
                {money(data.previousTotalCost, data.currency)})
              </Text>
            ) : (
              <Text style={styles.change}>No comparison week yet</Text>
            )}
            <View style={styles.factRow}>
              <Fact label="Entries" value={String(data.entryCount)} />
              <Fact label="Top reason" value={data.topReasonLabel ?? '—'} />
              <Fact label="Worst day" value={data.worstDay ?? '—'} />
            </View>
          </Card>

          <SectionTitle>Where the money went</SectionTitle>
          <Card>
            {data.topItems.map((item) => (
              <BarRow
                key={item.itemId}
                label={item.name}
                value={item.cost}
                max={maxItemCost}
                caption={money(item.cost, data.currency)}
              />
            ))}
          </Card>

          <SectionTitle>By day</SectionTitle>
          <Card>
            {data.byDay.map((day) => (
              <BarRow
                key={day.date}
                label={day.label}
                value={day.cost}
                max={maxDayCost}
                caption={money(day.cost, data.currency)}
                tone="amber"
              />
            ))}
          </Card>

          <SectionTitle>By reason</SectionTitle>
          <Card>
            {data.byReason.map((slice) => (
              <BarRow
                key={slice.reason}
                label={slice.label}
                value={slice.cost}
                max={data.totalCost}
                caption={`${money(slice.cost, data.currency)} · ${Math.round(slice.share * 100)}%`}
              />
            ))}
          </Card>

          <Text style={styles.footnote}>
            {data.fromSnapshot
              ? 'This week is closed — its headline numbers are frozen as you first read them.'
              : 'This week is still open, so these numbers move as you log.'}
          </Text>
        </>
      )}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekButton: { minHeight: 36, paddingHorizontal: 0 },
  weekLabel: { ...type.heading, color: colors.ink },
  recommendationCard: { backgroundColor: colors.amberSoft, borderColor: colors.amber },
  recommendationLabel: { ...type.label, color: '#8A5F1E', textTransform: 'uppercase' },
  recommendationText: { ...type.title, color: colors.ink, lineHeight: 30 },
  totalLabel: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase' },
  totalValue: { ...type.display, color: colors.ink },
  change: { ...type.body, color: colors.inkMuted },
  worse: { color: colors.tomato },
  better: { color: colors.green },
  factRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  fact: { flex: 1, gap: 2 },
  factLabel: { ...type.caption, color: colors.inkMuted },
  factValue: { ...type.body, color: colors.ink, fontWeight: '600' },
  footnote: { ...type.caption, color: colors.inkFaint, textAlign: 'center', paddingTop: spacing.sm },
});
