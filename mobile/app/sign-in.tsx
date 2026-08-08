import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { ApiError, API_BASE_URL } from '@/api/client';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing, type } from '@/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>nokori</Text>
          <Text style={styles.tagline}>See what your waste costs. Prep smarter next week.</Text>
        </View>

        {!!error && <Banner tone="error">{error}</Banner>}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@yourbusiness.com"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          placeholder="••••••••"
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        <Button title="Log in" onPress={submit} loading={busy} />

        <Link href="/sign-up" style={styles.link}>
          <Text style={styles.linkText}>New to Nokori? Create an account</Text>
        </Link>

        <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  header: { gap: spacing.xs, paddingVertical: spacing.xl },
  wordmark: { ...type.display, color: colors.green },
  tagline: { ...type.body, color: colors.inkMuted },
  link: { alignSelf: 'center', paddingVertical: spacing.md },
  linkText: { ...type.body, color: colors.green, fontWeight: '600' },
  apiHint: { ...type.caption, color: colors.inkFaint, textAlign: 'center' },
});
