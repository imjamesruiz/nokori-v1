import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useInventory } from '@/api/hooks';
import type { InventoryItem } from '@/api/types';
import { Button, Card, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { money, titleCase, unitLabel } from '@/format';
import { colors, spacing, type } from '@/theme';

/** Inventory (PRD F-003): the item list the log screen picks from, grouped by category. */
export default function Inventory() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useInventory(true);

  if (isPending) return <Loading />;

  const items = data ?? [];
  const active = items.filter((item) => item.active);
  const inactive = items.filter((item) => !item.active);

  const grouped = active.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <Button title="Add item" onPress={() => router.push('/item-editor')} />

      {active.length === 0 && (
        <EmptyState
          title="No items yet"
          body="Add the things you throw away most — that's all Nokori needs to price your waste."
        />
      )}

      {Object.entries(grouped).map(([category, categoryItems]) => (
        <View key={category} style={styles.group}>
          <SectionTitle>{titleCase(category)}</SectionTitle>
          <Card style={styles.listCard}>
            {categoryItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                divider={index > 0}
                onPress={() => router.push({ pathname: '/item-editor', params: { id: item.id } })}
              />
            ))}
          </Card>
        </View>
      ))}

      {inactive.length > 0 && (
        <View style={styles.group}>
          <SectionTitle>No longer tracked</SectionTitle>
          <Text style={styles.inactiveNote}>
            These stay in your history and reports, but can't be logged against.
          </Text>
          <Card style={styles.listCard}>
            {inactive.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                divider={index > 0}
                onPress={() => router.push({ pathname: '/item-editor', params: { id: item.id } })}
              />
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

function ItemRow({
  item,
  divider,
  onPress,
}: {
  item: InventoryItem;
  divider: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowName, !item.active && styles.rowNameInactive]}>{item.name}</Text>
        <Text style={styles.rowMeta}>per {unitLabel(item.unit)}</Text>
      </View>
      <Text style={styles.rowCost}>{money(item.costPerUnit)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  listCard: { gap: 0, paddingVertical: spacing.xs },
  inactiveNote: { ...type.caption, color: colors.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowPressed: { opacity: 0.6 },
  rowMain: { flex: 1, gap: 2 },
  rowName: { ...type.body, color: colors.ink, fontWeight: '600' },
  rowNameInactive: { color: colors.inkFaint },
  rowMeta: { ...type.caption, color: colors.inkMuted },
  rowCost: { ...type.heading, color: colors.ink, fontVariant: ['tabular-nums'] },
});
