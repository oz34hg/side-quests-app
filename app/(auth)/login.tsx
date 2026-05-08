import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CozyEnter } from '@/components/cozy-enter';
import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function LoginScreen() {
  const { ready, user, needsUsername, signInEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (ready && user && needsUsername) {
    return <Redirect href="/(auth)/set-username" />;
  }

  if (ready && user && !needsUsername) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onEmail = async () => {
    setBusy(true);
    try {
      await signInEmail(email, password);
    } catch (e) {
      Alert.alert('Sign in', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <CozyEnter>
            <View style={styles.formBlock}>
              <Text style={styles.title}>Side Quests</Text>
              <Text style={styles.sub}>Sign in with your email and password.</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Mocha.fg4}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Mocha.fg4}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Pressable style={[styles.btn, styles.primary]} disabled={busy} onPress={onEmail}>
                <Text style={styles.btnTextDark}>{busy ? '…' : 'Sign in'}</Text>
              </Pressable>

              <Link href="/(auth)/signup" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={styles.link}>Create account</Text>
                </Pressable>
              </Link>
            </View>
          </CozyEnter>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Mocha.bg0_h,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  formBlock: { gap: 14 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: Mocha.rosewater,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sub: {
    color: Mocha.fg3,
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 22,
  },
  btn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Mocha.blue,
  },
  btnTextDark: {
    fontWeight: '800',
    color: Mocha.fg0,
  },
  input: {
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    padding: 16,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  linkWrap: { alignItems: 'center', marginTop: 10 },
  link: { color: Mocha.flamingo, fontSize: 15, textDecorationLine: 'underline' },
});
