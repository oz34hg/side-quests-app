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

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useToast();
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
      void hapticSuccess();
    } catch (e) {
      showToast({ title: 'Sign in failed', message: e instanceof Error ? e.message : 'Failed', tone: 'error' });
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
          <CozyEnter>
            <View style={styles.formBlock}>
              <Text allowFontScaling={false} style={[styles.title, { color: theme.text }]}>
                Side Quests
              </Text>
              <Text style={[styles.sub, { color: theme.muted }]}>Sign in with your email and password.</Text>

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
                placeholder="Password"
                placeholderTextColor={theme.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <PressableScale style={[styles.btn, styles.primary, { backgroundColor: theme.primary }]} disabled={busy} onPress={onEmail}>
                <Text style={styles.btnTextDark}>{busy ? '…' : 'Sign in'}</Text>
              </PressableScale>

              <Link href="/(auth)/signup" asChild>
                <Pressable style={styles.linkWrap}>
                  <Text style={[styles.link, { color: theme.primary }]}>Create account</Text>
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
    letterSpacing: -0.5,
  },
  sub: { ...Typography.body, color: Mocha.fg3, textAlign: 'center', marginBottom: 2 },
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
