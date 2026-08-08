import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import { ApiError } from '@/api/client';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing, type } from '@/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password);
      router.replace('/setup');
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fieldErrors ?? {});
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}>
        <Text style={styles.intro}>
          One account per business. You'll add your tracked items right after this.
        </Text>

        {!!error && <Banner tone="error">{error}</Banner>}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@yourbusiness.com"
          error={fieldErrors.email}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 8 characters"
          hint="At least 8 characters."
          error={fieldErrors.password}
        />
        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={submit}
          returnKeyType="go"
          error={fieldErrors.confirm}
        />

        <Button title="Create account" onPress={submit} loading={busy} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  intro: { ...type.body, color: colors.inkMuted, paddingBottom: spacing.sm },
});
