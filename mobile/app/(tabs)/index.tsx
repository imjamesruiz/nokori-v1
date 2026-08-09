import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError, isUnreachable } from '@/api/client';
import { useDashboard } from '@/api/hooks';
import { SyncBanner } from '@/components/SyncBanner';
import { Banner, Button, Card, EmptyState, Loading, Row, Screen, Section, useStyles } from '@/components/ui';
import { dateRange, money, moneyShort, quantityWithUnit, shortDate } from '@/format';
import { tabular, useTheme } from '@/theme';

/**
 * Home (PRD F-005). One number is loud — the dollars — and everything else is deliberately
 * quiet around it. Logging floats above the scroll so it is always one tap away.
 */
export default function Home() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const { data, isLoading, error, refetch, isRefetching } = useDashboard(weeksAgo);
  const router = useRouter();
  const t = useTheme();
  const s = useStyles(t);
  const own = useOwnStyles();

  const logAction = (
    <Button title="Log waste" size="lg" pill onPress={() => router.push('/log-waste')} />
  );

  if (isLoading) return <Loading label="Loading your week…" />;

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

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />}
      floatingAction={logAction}>
      <SyncBanner />

      <View style={own.weekBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeeksAgo((w) => Math.min(w + 1, 12))}
          style={({ pressed }) => [own.stepper, pressed && s.pressed]}>
          <Text style={own.stepperGlyph}>‹</Text>
        </Pressable>

        <View style={own.weekLabelWrap}>
          <Text style={own.weekLabel}>{data.isCurrentWeek ? 'This week' : 'Week of'}</Text>
          <Text style={own.weekRange}>{dateRange(data.weekStart, data.weekEnd)}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => setWeeksAgo((w) => Math.max(w - 1, 0))}
          disabled={weeksAgo === 0}
          style={({ pressed }) => [own.stepper, weeksAgo === 0 && own.stepperOff, pressed && s.pressed]}>
          <Text style={own.stepperGlyph}>›</Text>
        </Pressable>
      </View>

      {/* The one loud thing on the screen. */}
      <Card tone="inverse" style={own.hero}>
        <Text style={own.heroLabel}>
          Wasted {data.isCurrentWeek ? 'so far this week' : 'that week'}
        </Text>
        <Text style={own.heroValue}>{money(data.totalWasted, currency)}</Text>

        <View style={own.heroFooter}>
          {change !== undefined && change !== null ? (
            <View style={[own.trend, wasteRose ? own.trendUp : own.trendDown]}>
              <Text style={[own.trendText, wasteRose ? own.trendTextUp : own.trendTextDown]}>
                {wasteRose ? '↑' : '↓'} {Math.abs(change)}%
              </Text>
            </View>
          ) : null}
          <Text style={own.heroMeta}>
            {change !== undefined && change !== null
              ? 'vs. previous week'
              : 'No comparison week yet'}
          </Text>
        </View>

        <View style={own.heroRule} />
        <Text style={own.heroProjection}>
          On this pace, about{' '}
          <Text style={own.heroProjectionStrong}>{moneyShort(data.projectedMonthly, currency)}</Text> a
          month
        </Text>
      </Card>

      {data.entryCount === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          body="Log one item — even a rough guess — and Nokori starts showing what it costs you."
        />
      ) : (
        <>
          <Section title="What drove it">
            <Card>
              {data.topItem && (
                <Row
                  first
                  label={data.topItem.name}
                  meta={`Most wasted · ${quantityWithUnit(data.topItem.quantity, data.topItem.unit)}`}
                  value={money(data.topItem.cost, currency)}
                />
              )}
              {data.worstDay && (
                <Row
                  label="Worst day"
                  meta={data.worstDay.label}
                  value={money(data.worstDay.cost, currency)}
                />
              )}
              {data.topReason && (
                <Row
                  label="Main reason"
                  meta={`${data.topReason.label} · ${Math.round(data.topReason.share * 100)}% of cost`}
                  value={money(data.topReason.cost, currency)}
                />
              )}
            </Card>
          </Section>

          <Section
            title="Recent"
            action={
              <Pressable accessibilityRole="button" onPress={() => router.push('/history')}>
                <Text style={own.link}>See all</Text>
              </Pressable>
            }>
            <Card>
              {data.recentEntries.map((entry, index) => (
                <Row
                  key={entry.id}
                  first={index === 0}
                  label={entry.itemName}
                  meta={`${quantityWithUnit(entry.quantity, entry.unit)} · ${entry.reasonLabel} · ${shortDate(entry.wasteDate)}`}
                  value={money(entry.totalCostLost, currency)}
                />
              ))}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return React.useMemo(
    () =>
      StyleSheet.create({
        weekBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        weekLabelWrap: { alignItems: 'center', gap: 1 },
        weekLabel: { ...t.text.subhead, color: t.colors.ink },
        weekRange: { ...t.text.caption, color: t.colors.inkMuted, ...tabular },
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

        hero: { paddingHorizontal: t.space.xl, paddingVertical: t.space.xl, gap: t.space.xs },
        heroLabel: { ...t.text.label, color: t.colors.onBrandMuted },
        heroValue: { ...t.text.display, color: t.colors.onBrand, ...tabular, marginTop: t.space.xs },
        heroFooter: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.sm },
        trend: { paddingHorizontal: t.space.sm, paddingVertical: 3, borderRadius: t.radius.sm },
        trendUp: { backgroundColor: 'rgba(230, 129, 104, 0.22)' },
        trendDown: { backgroundColor: 'rgba(107, 184, 147, 0.22)' },
        trendText: { ...t.text.caption, fontWeight: '700', ...tabular },
        trendTextUp: { color: '#F3B4A3' },
        trendTextDown: { color: '#9EDCBC' },
        heroMeta: { ...t.text.caption, color: t.colors.onBrandMuted },
        heroRule: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: 'rgba(255,255,255,0.16)',
          marginVertical: t.space.lg,
        },
        heroProjection: { ...t.text.body, color: t.colors.onBrandMuted },
        heroProjectionStrong: { color: t.colors.onBrand, fontWeight: '600', ...tabular },

        footnote: { ...t.text.caption, color: t.colors.inkFaint, paddingHorizontal: t.space.xs },
        link: { ...t.text.label, color: t.colors.brand },
      }),
    [t],
  );
}
