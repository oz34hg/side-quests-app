import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ScreenEnter } from '@/components/screen-enter';
import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, profile, signOut, updateDisplayName, uploadProfilePhoto } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  const saveName = async () => {
    setBusy(true);
    try {
      await updateDisplayName(name);
      Alert.alert('Saved', 'Display name updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert('Photos', 'Allow library access to set a profile picture.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setBusy(true);
    try {
      await uploadProfilePhoto(picked.assets[0].uri);
    } catch (e) {
      Alert.alert('Upload', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenEnter>
      <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.userLine}>@{profile?.username ?? '…'}</Text>
      <Text style={styles.email}>{user?.email ?? 'No email on this account'}</Text>

      <PressableScale style={styles.avatarWrap} onPress={pickPhoto} disabled={busy}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPh]}>
            <Text style={styles.avatarPhText}>Tap to add photo</Text>
          </View>
        )}
      </PressableScale>

      <Text style={styles.label}>Display name</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="How you appear in the app"
          placeholderTextColor={Mocha.fg4}
        />
        <PressableScale style={styles.saveBtn} onPress={saveName} disabled={busy}>
          <Text style={styles.saveText}>Save</Text>
        </PressableScale>
      </View>

      <PressableScale style={styles.signOut} onPress={() => void signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </PressableScale>
      </SafeAreaView>
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Mocha.bg0_h, padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: Mocha.rosewater, letterSpacing: 0.2 },
  userLine: { color: Mocha.lavender, fontSize: 16, fontWeight: '700' },
  email: { color: Mocha.fg3, fontSize: 13 },
  avatarWrap: { alignSelf: 'center', marginVertical: 10, padding: 4, borderRadius: 72, borderWidth: 2, borderColor: `${Mocha.purple}66` },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: Mocha.bg2 },
  avatarPh: { justifyContent: 'center', alignItems: 'center', padding: 8 },
  avatarPhText: { color: Mocha.fg4, textAlign: 'center', fontSize: 12 },
  label: { color: Mocha.fg3, fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Mocha.bg1,
    borderRadius: 14,
    padding: 14,
    color: Mocha.fg1,
    borderWidth: 1,
    borderColor: Mocha.bg3,
  },
  saveBtn: {
    backgroundColor: Mocha.blue,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveText: { color: Mocha.fg0, fontWeight: '800' },
  signOut: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: Mocha.red,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  signOutText: { color: Mocha.red, fontWeight: '800' },
});
