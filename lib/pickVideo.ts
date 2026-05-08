import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

type PickOpts = { maxDurationSeconds: number; minDurationSeconds?: number; purpose: 'proof' | 'vlog' };

function durationSecondsFromAsset(asset: { duration?: number | null } | undefined): number {
  const d = asset?.duration;
  if (typeof d !== 'number' || !Number.isFinite(d) || d <= 0) return 0;
  // Expo can return seconds on some platforms and milliseconds on others.
  return d > 1000 ? d / 1000 : d;
}

/**
 * On web, opens the file picker (camera is not supported). On native, records from the camera.
 */
export async function pickVideoRecording({ maxDurationSeconds, purpose }: PickOpts): Promise<string | null> {
  const label = purpose === 'proof' ? 'proof' : 'vlog';
  const minDurationSeconds = Math.max(0, Math.floor(Math.min(maxDurationSeconds, 60)));
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
      if (minDurationSeconds > 0) {
        const seconds = durationSecondsFromAsset(picked.assets[0]);
        if (seconds > 0 && seconds < minDurationSeconds) {
          Alert.alert('Video too short', `Please choose a video at least ${minDurationSeconds} seconds long.`);
          return null;
        }
      }
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
    if (minDurationSeconds > 0) {
      const seconds = durationSecondsFromAsset(picked.assets[0]);
      if (seconds > 0 && seconds < minDurationSeconds) {
        Alert.alert('Video too short', `Please record at least ${minDurationSeconds} seconds for ${label}.`);
        return null;
      }
    }
    return picked.assets[0].uri;
  } catch (e) {
    Alert.alert('Video', e instanceof Error ? e.message : 'Failed');
    return null;
  }
}
