import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CozyEnter } from '@/components/cozy-enter';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/constants/design';
import { Mocha } from '@/constants/mocha';
import { useAppTheme } from '@/context/AppThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { hapticSuccess } from '@/utils/haptics';

export default function SetUsernameScreen() {
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const { ready, user, needsUsername, claimUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!ready) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingBlock}>
          <Skeleton style={styles.loadingOrb} />
          <Skeleton style={styles.loadingLine} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!needsUsername) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onSave = async () => {
    setBusy(true);
    try {
      await claimUsername(username);
      void hapticSuccess();
    } catch (e) {
      showToast({
        title: 'Username error',
        message: e instanceof Error ? e.message : 'Could not save username.',
        tone: 'error',
      });
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
          <CozyEnter delay={60}>
            <View style={styles.formBlock}>
              <Text allowFontScaling={false} style={[styles.title, { color: theme.text }]}>
                Pick a username
              </Text>
              <Text style={[styles.sub, { color: theme.muted }]}>Shown in squads, chat, and scoreboards. 3–20 chars.</Text>
              <TextInput
                style={styles.input}
                placeholder="username"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
              <PressableScale style={[styles.btn, { backgroundColor: theme.primary }, busy && styles.disabled]} disabled={busy} onPress={onSave}>
                <Text style={styles.btnText}>{busy ? '…' : 'Save'}</Text>
              </PressableScale>
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
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingBlock: { alignItems: 'center', gap: 10 },
  loadingOrb: { width: 52, height: 52, borderRadius: 26 },
  loadingLine: { width: 140, height: 16, borderRadius: 10 },
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
  sub: { ...Typography.body, color: Mocha.fg3, textAlign: 'center' },
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
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  btnText: { fontWeight: '800', color: Mocha.fg0 },
});
