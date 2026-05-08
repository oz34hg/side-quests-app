import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

type PickOpts = { maxDurationSeconds: number; purpose: 'proof' | 'vlog' };

/**
 * On web, opens the file picker (camera is not supported). On native, records from the camera.
 */
export async function pickVideoRecording({ maxDurationSeconds, purpose }: PickOpts): Promise<string | null> {
  const label = purpose === 'proof' ? 'proof' : 'vlog';
  try {
    if (Platform.OS === 'web') {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert('Videos', `Allow access to videos to upload your ${label}.`);
        return null;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: maxDurationSeconds,
        quality: 1,
      });
      if (picked.canceled || !picked.assets[0]?.uri) return null;
      return picked.assets[0].uri;
    }

    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert('Camera', `Allow camera to record your ${label}.`);
      return null;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: maxDurationSeconds,
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return null;
    return picked.assets[0].uri;
  } catch (e) {
    Alert.alert('Video', e instanceof Error ? e.message : 'Failed');
    return null;
  }
}
