import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { money } from '@/format';
import { useOffline } from '@/offline/OfflineContext';
import { tabular, useTheme } from '@/theme';

/**
 * The "n entries pending sync" strip from PRD F-012. Deliberately quiet: queued entries are
 * saved as far as the user is concerned, so this reassures rather than alarms.
 */
export function SyncBanner() {
  const { pending, failed, syncing, syncNow, dismissFailed } = useOffline();
  const t = useTheme();
  const s = useOwnStyles();

  if (pending.length === 0 && failed.length === 0) return null;

  const pendingValue = pending.reduce((sum, entry) => sum + entry.quantity * entry.costPerUnit, 0);

  return (
    <View style={s.stack}>
      {pending.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${pending.length} entries waiting to sync. Tap to retry now.`}
          onPress={() => void syncNow()}
          style={({ pressed }) => [s.pending, pressed && { opacity: 0.7 }]}>
          <View style={s.dot} />
          <View style={s.copy}>
            <Text style={s.title}>
              {pending.length} {pending.length === 1 ? 'entry' : 'entries'} waiting to upload
            </Text>
            <Text style={s.body}>
              <Text style={s.amount}>{money(pendingValue)}</Text> saved on this phone
            </Text>
          </View>
          {syncing ? (
            <ActivityIndicator color={t.colors.warning} />
          ) : (
            <Text style={s.action}>Retry</Text>
          )}
        </Pressable>
      )}

      {failed.length > 0 && (
        <View style={s.failed}>
          <Text style={s.failedTitle}>
            {failed.length} {failed.length === 1 ? "entry couldn't" : "entries couldn't"} be saved
          </Text>
          {failed.slice(0, 3).map((entry) => (
            <Text key={entry.clientUuid} style={s.failedBody}>
              {entry.itemName} — {entry.error}
            </Text>
          ))}
          <Pressable accessibilityRole="button" onPress={() => void dismissFailed()} style={s.dismiss}>
            <Text style={s.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return React.useMemo(
    () =>
      StyleSheet.create({
        stack: { gap: t.space.sm },
        pending: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          backgroundColor: t.colors.warningTint,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
        },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.warning },
        copy: { flex: 1, gap: 1 },
        title: { ...t.text.bodyStrong, color: t.colors.ink },
        body: { ...t.text.caption, color: t.colors.inkMuted },
        amount: { ...tabular, fontWeight: '600', color: t.colors.ink },
        action: { ...t.text.label, color: t.colors.brand },
        failed: {
          backgroundColor: t.colors.upTint,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          gap: 2,
        },
        failedTitle: { ...t.text.bodyStrong, color: t.colors.up },
        failedBody: { ...t.text.caption, color: t.colors.ink },
        dismiss: { alignSelf: 'flex-start', paddingTop: t.space.sm },
        dismissText: { ...t.text.label, color: t.colors.up },
      }),
    [t],
  );
}
