import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function canHaptic() {
  return Platform.OS !== 'web';
}

export async function hapticSelection() {
  if (!canHaptic()) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // no-op: haptics are best-effort
  }
}

export async function hapticSuccess() {
  if (!canHaptic()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // no-op: haptics are best-effort
  }
}
