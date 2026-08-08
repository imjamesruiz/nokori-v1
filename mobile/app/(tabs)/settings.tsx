import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { ApiError, API_BASE_URL, fetchCsv } from '@/api/client';
import { useBusiness } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, Card, Loading, Screen, SectionTitle } from '@/components/ui';
import { titleCase } from '@/format';
import { colors, spacing, type } from '@/theme';

export default function Settings() {
  const { user, signOut, deleteAccount } = useAuth();
  const { data: business, isLoading } = useBusiness();
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);

  async function exportCsv() {
    setStatus(null);
    setBusy('export');
    try {
      const csv = await fetchCsv({});
      const filename = `nokori-waste-${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web') {
        // Browsers have no share sheet for files; hand the user a download instead.
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        setStatus({ tone: 'success', message: 'Downloaded your CSV.' });
        return;
      }

      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      } else {
        setStatus({ tone: 'success', message: `Saved to ${file.uri}` });
      }
    } catch (e) {
      setStatus({
        tone: 'error',
        message: e instanceof ApiError ? e.message : 'Could not export your data.',
      });
    } finally {
      setBusy(null);
    }
  }

  function confirmDeleteAccount() {
    const run = async () => {
      setBusy('delete');
      try {
        await deleteAccount();
      } catch (e) {
        setStatus({
          tone: 'error',
          message: e instanceof ApiError ? e.message : 'Could not delete your account.',
        });
      } finally {
        setBusy(null);
      }
    };

    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert(
      'Delete your account?',
      'This permanently removes your business, items, and every waste entry. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => void run() },
      ],
    );
  }

  if (isLoading) return <Loading />;

  return (
    <Screen>
      {!!status && <Banner tone={status.tone}>{status.message}</Banner>}

      <SectionTitle>Business</SectionTitle>
      <Card>
        <Row label="Name" value={business?.name ?? '—'} />
        <Row label="Type" value={business ? titleCase(business.businessType) : '—'} />
        <Row label="City" value={business?.city ?? '—'} />
        <Row label="Timezone" value={business?.timezone ?? '—'} />
        <Text style={styles.note}>
          Your timezone decides where each week starts and ends — Monday 00:00 to Sunday 23:59.
        </Text>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card>
        <Button
          title="Export waste data (CSV)"
          variant="secondary"
          onPress={exportCsv}
          loading={busy === 'export'}
        />
        <Text style={styles.note}>
          Every entry with its date, item, quantity, cost, and reason — opens in any spreadsheet.
        </Text>
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <Row label="Signed in as" value={user?.email ?? '—'} />
        <Button title="Log out" variant="secondary" onPress={() => void signOut()} />
        <Button
          title="Delete account"
          variant="danger"
          onPress={confirmDeleteAccount}
          loading={busy === 'delete'}
        />
        <Text style={styles.note}>
          Deleting removes your account and all of its data. Nothing is kept.
        </Text>
      </Card>

      <Text style={styles.footer}>Nokori · connected to {API_BASE_URL}</Text>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  rowLabel: { ...type.body, color: colors.inkMuted },
  rowValue: { ...type.body, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  note: { ...type.caption, color: colors.inkMuted },
  footer: { ...type.caption, color: colors.inkFaint, textAlign: 'center', paddingTop: spacing.lg },
});
