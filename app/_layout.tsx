import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';

import { AmbientOrbs } from '@/components/ambient-orbs';
import { Mocha } from '@/constants/mocha';
import { MochaNavigationTheme } from '@/constants/navigationTheme';
import { AuthProvider } from '@/context/AuthContext';
import { GroupProvider } from '@/context/GroupContext';

function AppTree() {
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: Mocha.bg0_h }}>
      <AmbientOrbs />
      <View style={{ flex: 1, zIndex: 1 }}>
        <AuthProvider>
          <GroupProvider>
            <ThemeProvider value={MochaNavigationTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
              <StatusBar style="light" />
            </ThemeProvider>
          </GroupProvider>
        </AuthProvider>
      </View>
    </View>
  );
}

export default function RootLayout() {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: Mocha.bg0_h }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden' }}>
          <AppTree />
        </View>
      </View>
    );
  }
  return <AppTree />;
}
