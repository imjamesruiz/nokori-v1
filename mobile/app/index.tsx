import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { colors, type } from '@/theme';

/** Routing gate: restore the session, then send the user to sign-in, setup, or Home. */
export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.wordmark}>nokori</Text>
        <Text style={styles.tagline}>Turn what's left into what's learned.</Text>
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/sign-in" />;
  }

  return user?.hasBusiness ? <Redirect href="/(tabs)" /> : <Redirect href="/setup" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', gap: 8 },
  wordmark: { ...type.display, color: '#fff' },
  tagline: { ...type.body, color: colors.greenSoft },
});
