import { Link, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { API_BASE_URL, ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const router = useRouter();
  const own = useOwnStyles();

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
        style={own.form}>
        <View style={own.header}>
          <Text style={own.wordmark}>nokori</Text>
          <Text style={own.tagline}>See what your waste costs. Prep smarter next week.</Text>
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

        <Button title="Log in" size="lg" onPress={submit} loading={busy} />

        <Link href="/sign-up" style={own.link}>
          <Text style={own.linkText}>New to Nokori? Create an account</Text>
        </Link>

        <Text style={own.api}>{API_BASE_URL}</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function useOwnStyles() {
  const t = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        form: { gap: t.space.lg },
        header: { gap: t.space.sm, paddingTop: t.space.xxxl, paddingBottom: t.space.lg },
        wordmark: { ...t.text.display, color: t.colors.brand, letterSpacing: -2 },
        tagline: { ...t.text.body, color: t.colors.inkMuted, maxWidth: 260 },
        link: { alignSelf: 'center', paddingVertical: t.space.sm },
        linkText: { ...t.text.bodyStrong, color: t.colors.brand },
        api: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
      }),
    [t],
  );
}
