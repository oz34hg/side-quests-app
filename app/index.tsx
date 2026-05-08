import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Radius, Space } from '@/constants/design';
import { Mocha } from '@/constants/mocha';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function Index() {
  const { ready, user, needsUsername } = useAuth();

  if (!isFirebaseConfigured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Skeleton style={styles.skeletonOrb} />
        <Skeleton style={styles.skeletonLineWide} />
        <Skeleton style={styles.skeletonLineShort} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsUsername) {
    return <Redirect href="/(auth)/set-username" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Mocha.bg0_h,
    gap: Space[2],
    paddingHorizontal: Space[4],
  },
  skeletonOrb: { width: 64, height: 64, borderRadius: Radius.full },
  skeletonLineWide: { width: 220, height: 18, borderRadius: Radius.sm },
  skeletonLineShort: { width: 140, height: 18, borderRadius: Radius.sm },
});
