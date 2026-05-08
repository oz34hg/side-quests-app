import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function AppLayout() {
  const { ready, user, needsUsername } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsUsername) {
    return <Redirect href="/(auth)/set-username" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
