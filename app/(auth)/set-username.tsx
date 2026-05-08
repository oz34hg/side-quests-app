import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

function notifyError(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Username', message);
  }
}

export default function SetUsernameScreen() {
  const { ready, user, needsUsername, claimUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!ready) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={Mocha.fg3} />
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
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not save username.');
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
          <CozyEnter delay={60}>
            <View style={styles.formBlock}>
              <Text style={styles.title}>Pick a username</Text>
              <Text style={styles.sub}>Shown in squads, chat, and scoreboards. 3–20 chars.</Text>
              <TextInput
                style={styles.input}
                placeholder="username"
                placeholderTextColor={Mocha.fg4}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
              <Pressable style={[styles.btn, busy && styles.disabled]} disabled={busy} onPress={onSave}>
                <Text style={styles.btnText}>{busy ? '…' : 'Save'}</Text>
              </Pressable>
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
    letterSpacing: 0.2,
  },
  sub: { color: Mocha.fg3, textAlign: 'center', lineHeight: 22 },
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
