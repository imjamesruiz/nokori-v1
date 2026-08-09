import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { money } from '@/format';
import { useOffline } from '@/offline/OfflineContext';
import { colors, radius, spacing, type } from '@/theme';

/**
 * The subtle "n entries pending sync" strip from PRD F-012. Deliberately quiet: queued entries
 * are saved as far as the user is concerned, so this reassures rather than alarms.
 */
export function SyncBanner() {
  const { pending, failed, syncing, syncNow, dismissFailed } = useOffline();

  if (pending.length === 0 && failed.length === 0) return null;

  const pendingValue = pending.reduce((sum, entry) => sum + entry.quantity * entry.costPerUnit, 0);

  return (
    <View style={styles.stack}>
      {pending.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${pending.length} entries waiting to sync. Tap to retry now.`}
          onPress={() => void syncNow()}
          style={styles.pending}>
          <View style={styles.pendingCopy}>
            <Text style={styles.pendingTitle}>
              {pending.length} {pending.length === 1 ? 'entry' : 'entries'} pending sync
            </Text>
            <Text style={styles.pendingBody}>
              {money(pendingValue)} saved on this phone — they'll upload when you're back online.
            </Text>
          </View>
          {syncing ? (
            <ActivityIndicator color={colors.amber} />
          ) : (
            <Text style={styles.retry}>Retry</Text>
          )}
        </Pressable>
      )}

      {failed.length > 0 && (
        <View style={styles.failed}>
          <Text style={styles.failedTitle}>
            {failed.length} {failed.length === 1 ? 'entry' : 'entries'} couldn't be saved
          </Text>
          {failed.slice(0, 3).map((entry) => (
            <Text key={entry.clientUuid} style={styles.failedBody}>
              {entry.itemName} — {entry.error}
            </Text>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => void dismissFailed()}
            style={styles.dismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pendingCopy: { flex: 1, gap: 2 },
  pendingTitle: { ...type.body, color: colors.ink, fontWeight: '600' },
  pendingBody: { ...type.caption, color: colors.inkMuted },
  retry: { ...type.body, color: colors.green, fontWeight: '600' },
  failed: { backgroundColor: colors.tomatoSoft, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  failedTitle: { ...type.body, color: colors.tomato, fontWeight: '600' },
  failedBody: { ...type.caption, color: colors.ink },
  dismiss: { alignSelf: 'flex-start', paddingTop: spacing.sm },
  dismissText: { ...type.body, color: colors.tomato, fontWeight: '600' },
});
