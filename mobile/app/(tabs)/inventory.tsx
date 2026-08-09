import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text } from 'react-native';

import { useInventory } from '@/api/hooks';
import type { InventoryItem } from '@/api/types';
import { Button, Card, EmptyState, Loading, Row, Screen, Section } from '@/components/ui';
import { money, titleCase, unitLabel } from '@/format';
import { useTheme } from '@/theme';

/** Inventory (PRD F-003): the list the log screen picks from, grouped by category. */
export default function Inventory() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useInventory(true);
  const t = useTheme();
  const own = useOwnStyles();

  if (isPending) return <Loading />;

  const items = data ?? [];
  const active = items.filter((item) => item.active);
  const inactive = items.filter((item) => !item.active);

  const grouped = active.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.colors.inkFaint} />
      }
      floatingAction={<Button title="Add item" size="lg" pill onPress={() => router.push('/item-editor')} />}>
      {active.length === 0 && inactive.length === 0 && (
        <EmptyState
          title="No items yet"
          body="Add the things you throw away most — that's all Nokori needs to price your waste."
        />
      )}

      {Object.entries(grouped).map(([category, categoryItems]) => (
        <Section key={category} title={titleCase(category)}>
          <Card>
            {categoryItems.map((item, index) => (
              <Row
                key={item.id}
                first={index === 0}
                label={item.name}
                meta={`per ${unitLabel(item.unit)}`}
                value={money(item.costPerUnit)}
                onPress={() => router.push({ pathname: '/item-editor', params: { id: item.id } })}
              />
            ))}
          </Card>
        </Section>
      ))}

      {inactive.length > 0 && (
        <Section title="No longer tracked">
          <Card>
            {inactive.map((item, index) => (
              <Row
                key={item.id}
                first={index === 0}
                label={item.name}
                meta={`per ${unitLabel(item.unit)}`}
                value={money(item.costPerUnit)}
                onPress={() => router.push({ pathname: '/item-editor', params: { id: item.id } })}
              />
            ))}
          </Card>
          <Text style={own.note}>
            These stay in your history and reports, but can't be logged against.
          </Text>
        </Section>
      )}
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () => StyleSheet.create({ note: { ...t.text.caption, color: t.colors.inkFaint } }),
    [t],
  );
}
