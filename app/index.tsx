import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function Index() {
  const { ready, user, needsUsername } = useAuth();

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Mocha.fg3} />
        <Text style={styles.muted}>Starting…</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsUsername) {
    return <Redirect href="/(auth)/set-username" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Mocha.bg0_h,
    gap: 12,
  },
  muted: {
    color: Mocha.fg4,
    fontSize: 14,
  },
});
