import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { API_BASE_URL, ApiError, fetchCsv } from '@/api/client';
import { useAppearance, type AppearancePreference } from '@/appearance';
import { useBusiness } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, Card, ChipRow, Loading, Row, Screen, Section } from '@/components/ui';
import { titleCase } from '@/format';
import { useTheme } from '@/theme';

export default function Settings() {
  const { user, signOut, deleteAccount } = useAuth();
  const { data: business, isLoading } = useBusiness();
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const { preference, setPreference } = useAppearance();
  const own = useOwnStyles();

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
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
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

      <Section title="Business">
        <Card>
          <Row first label="Name" value={business?.name ?? '—'} />
          <Row label="Type" value={business ? titleCase(business.businessType) : '—'} />
          <Row label="City" value={business?.city ?? '—'} />
          <Row label="Timezone" value={business?.timezone ?? '—'} />
        </Card>
        <Text style={own.note}>
          Your timezone decides where each week starts and ends — Monday 00:00 to Sunday 23:59.
        </Text>
      </Section>

      <Section title="Appearance">
        <ChipRow<AppearancePreference>
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={preference}
          onChange={setPreference}
        />
        <Text style={own.note}>
          System follows your phone's light/dark setting. Choose Light or Dark to override it.
        </Text>
      </Section>

      <Section title="Your data">
        <Button
          title="Export waste data (CSV)"
          variant="secondary"
          onPress={exportCsv}
          loading={busy === 'export'}
        />
        <Text style={own.note}>
          Every entry with its date, item, quantity, cost, and reason — opens in any spreadsheet.
        </Text>
      </Section>

      <Section title="Account">
        <Card>
          <Row first label="Signed in as" value={user?.email ?? '—'} />
        </Card>
        <View style={own.actions}>
          <Button title="Log out" variant="secondary" onPress={() => void signOut()} />
          <Button
            title="Delete account"
            variant="dangerQuiet"
            onPress={confirmDeleteAccount}
            loading={busy === 'delete'}
          />
        </View>
        <Text style={own.note}>
          Deleting removes your account and all of its data. Nothing is kept.
        </Text>
      </Section>

      <Text style={own.footer}>nokori · {API_BASE_URL}</Text>
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        note: { ...t.text.caption, color: t.colors.inkFaint },
        actions: { gap: t.space.sm },
        footer: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
      }),
    [t],
  );
}
