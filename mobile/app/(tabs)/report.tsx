import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useWeeklyReport } from '@/api/hooks';
import { BarRow, Card, EmptyState, Loading, Metric, Screen, Section, useStyles } from '@/components/ui';
import { dateRange, money } from '@/format';
import { tabular, useTheme } from '@/theme';

/** Weekly report (PRD F-007): the recommendation leads, the evidence follows. */
export default function Report() {
  const [weeksAgo, setWeeksAgo] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useWeeklyReport(weeksAgo);
  const t = useTheme();
  const s = useStyles(t);
  const own = useOwnStyles();

  if (isLoading) return <Loading label="Building your report…" />;
  if (!data) return null;

  const maxItemCost = Math.max(...data.topItems.map((i) => i.cost), 0);
  const maxDayCost = Math.max(...data.byDay.map((d) => d.cost), 0);
  const change = data.changePercent;
  const wasteRose = change !== undefined && change !== null && change > 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />}>
      <View style={own.weekBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Earlier week"
          onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
          style={({ pressed }) => [own.stepper, pressed && s.pressed]}>
          <Text style={own.stepperGlyph}>‹</Text>
        </Pressable>
        <Text style={own.weekRange}>{dateRange(data.weekStart, data.weekEnd)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Later week"
          onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
          disabled={weeksAgo === 0}
          style={({ pressed }) => [own.stepper, weeksAgo === 0 && own.stepperOff, pressed && s.pressed]}>
          <Text style={own.stepperGlyph}>›</Text>
        </Pressable>
      </View>

      {data.entryCount === 0 ? (
        <EmptyState
          title="No entries that week"
          body="Weeks with nothing logged stay empty — Nokori never guesses numbers you didn't record."
        />
      ) : (
        <>
          {/* The single most valuable sentence in the product gets the loudest surface. */}
          <View style={own.advice}>
            <Text style={own.adviceLabel}>Do this next</Text>
            <Text style={own.adviceText}>{data.recommendation.text}</Text>
          </View>

          <Card style={own.totalCard}>
            <Text style={own.totalLabel}>Total wasted</Text>
            <Text style={own.totalValue}>{money(data.totalCost, data.currency)}</Text>
            {change !== undefined && change !== null ? (
              <Text style={own.totalChange}>
                <Text style={{ color: wasteRose ? t.colors.up : t.colors.down, fontWeight: '700' }}>
                  {wasteRose ? '↑' : '↓'} {Math.abs(change)}%
                </Text>
                {`  vs. ${money(data.previousTotalCost, data.currency)} the week before`}
              </Text>
            ) : (
              <Text style={own.totalChange}>No comparison week yet</Text>
            )}
            <View style={own.metrics}>
              <Metric label="Entries" value={String(data.entryCount)} />
              <Metric label="Top reason" value={data.topReasonLabel ?? '—'} />
              <Metric label="Worst day" value={data.worstDay ?? '—'} />
            </View>
          </Card>

          <Section title="Where the money went">
            <Card>
              {data.topItems.map((item, index) => (
                <BarRow
                  key={item.itemId}
                  first={index === 0}
                  label={item.name}
                  value={item.cost}
                  max={maxItemCost}
                  caption={money(item.cost, data.currency)}
                />
              ))}
            </Card>
          </Section>

          <Section title="By day">
            <Card>
              {data.byDay.map((day, index) => (
                <BarRow
                  key={day.date}
                  first={index === 0}
                  label={day.label}
                  value={day.cost}
                  max={maxDayCost}
                  caption={money(day.cost, data.currency)}
                  tone="warning"
                />
              ))}
            </Card>
          </Section>

          <Section title="By reason">
            <Card>
              {data.byReason.map((slice, index) => (
                <BarRow
                  key={slice.reason}
                  first={index === 0}
                  label={slice.label}
                  value={slice.cost}
                  max={data.totalCost}
                  caption={`${money(slice.cost, data.currency)} · ${Math.round(slice.share * 100)}%`}
                />
              ))}
            </Card>
          </Section>

          <Text style={own.footnote}>
            {data.fromSnapshot
              ? 'This week is closed — its headline numbers are frozen as you first read them.'
              : 'This week is still open, so these numbers move as you log.'}
          </Text>
        </>
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
        weekRange: { ...t.text.subhead, color: t.colors.ink, ...tabular },
        stepper: {
          width: 40,
          height: 40,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.colors.hairline,
        },
        stepperOff: { opacity: 0.3 },
        stepperGlyph: { fontSize: 20, lineHeight: 24, color: t.colors.inkMuted },

        advice: {
          backgroundColor: t.colors.warningTint,
          borderRadius: t.radius.lg,
          padding: t.space.xl,
          gap: t.space.sm,
          borderLeftWidth: 3,
          borderLeftColor: t.colors.warning,
        },
        adviceLabel: { ...t.text.label, color: t.colors.warning },
        adviceText: { ...t.text.title, color: t.colors.ink, fontSize: 22, lineHeight: 30 },

        totalCard: { paddingHorizontal: t.space.xl, paddingVertical: t.space.xl, gap: t.space.xs },
        totalLabel: { ...t.text.label, color: t.colors.inkMuted },
        totalValue: { ...t.text.display, color: t.colors.ink, ...tabular },
        totalChange: { ...t.text.caption, color: t.colors.inkMuted, marginTop: t.space.xs },
        metrics: {
          flexDirection: 'row',
          gap: t.space.md,
          marginTop: t.space.lg,
          paddingTop: t.space.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.colors.hairline,
        },

        footnote: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
      }),
    [t],
  );
}
