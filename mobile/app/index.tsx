import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { palette, text } from '@/theme';

/** Routing gate: restore the session, then send the user to sign-in, setup, or Home. */
export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.wordmark}>nokori</Text>
        <View style={styles.rule} />
        <Text style={styles.tagline}>Turn what's left into what's learned.</Text>
      </View>
    );
  }

  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  return user?.hasBusiness ? <Redirect href="/(tabs)" /> : <Redirect href="/setup" />;
}

// The splash is the one place the brand gets the whole screen, so it is intentionally
// fixed to the dark green rather than following the colour scheme.
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: palette.light.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  wordmark: { ...text.display, color: '#FFFFFF', letterSpacing: -2 },
  rule: { width: 28, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  tagline: { ...text.body, color: palette.light.onBrandMuted },
});
