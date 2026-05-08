import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CozyEnter } from '@/components/cozy-enter';
import { Mocha } from '@/constants/mocha';

export default function SetupScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <CozyEnter>
        <Text style={styles.title}>Firebase not configured</Text>
        <Text style={styles.p}>
          Create a Firebase project (Spark / free tier). Enable Authentication (Email/Password)
          and create a Firestore database plus Storage.
        </Text>
        <Text style={styles.p}>
          In the project root, copy{' '}
          <Text style={styles.mono}>.env.example</Text> to <Text style={styles.mono}>.env</Text> and
          fill every <Text style={styles.mono}>EXPO_PUBLIC_FIREBASE_*</Text> value from your Firebase
          console.
        </Text>
        <Text style={styles.p}>
          Deploy the rules in <Text style={styles.mono}>firebase/</Text> with the Firebase CLI (
          <Text style={styles.mono}>firebase deploy --only firestore:rules,storage</Text>
          ).
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>I have configured .env — go to sign in</Text>
        </Link>
        </CozyEnter>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Mocha.bg0_h },
  container: {
    padding: 24,
    backgroundColor: Mocha.bg0_h,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Mocha.rosewater,
    letterSpacing: 0.2,
  },
  p: {
    color: Mocha.fg2,
    fontSize: 15,
    lineHeight: 24,
  },
  mono: {
    fontFamily: 'monospace',
    color: Mocha.orange,
  },
  link: {
    marginTop: 12,
  },
  linkText: {
    color: Mocha.flamingo,
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
