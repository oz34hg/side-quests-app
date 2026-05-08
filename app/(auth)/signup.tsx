import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
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
import { PressableScale } from '@/components/pressable-scale';
import { Typography } from '@/constants/design';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { hapticSuccess } from '@/utils/haptics';

export default function SignupScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { ready, user, needsUsername, signUpEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (ready && user && !needsUsername) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onSubmit = async () => {
    setBusy(true);
    try {
      await signUpEmail(email, password, username);
      void hapticSuccess();
    } catch (e) {
      showToast({ title: 'Sign up failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <CozyEnter delay={40}>
            <View style={styles.formBlock}>
              <Text allowFontScaling={false} style={[styles.title, { color: theme.text }]}>
                Create account
              </Text>
              <Text style={[styles.sub, { color: theme.muted }]}>
                Unique username (letters, numbers, underscore). 3–20 chars.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password (6+ chars)"
                placeholderTextColor={theme.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <PressableScale style={[styles.btn, { backgroundColor: theme.primary }, busy && styles.disabled]} disabled={busy} onPress={onSubmit}>
                <Text style={styles.btnText}>{busy ? '…' : 'Sign up'}</Text>
              </PressableScale>
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.link, { color: theme.primary }]}>Already have an account</Text>
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
    fontSize: 26,
    fontWeight: '800',
    color: Mocha.rosewater,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: { ...Typography.body, color: Mocha.fg3, marginBottom: 2, textAlign: 'center' },
  input: {
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    padding: 16,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  btn: {
    backgroundColor: Mocha.blue,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.5 },
  btnText: { fontWeight: '800', color: Mocha.fg0 },
  linkWrap: { alignItems: 'center', marginTop: 12 },
  link: { color: Mocha.flamingo, textDecorationLine: 'underline' },
});
