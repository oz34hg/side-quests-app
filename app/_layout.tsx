import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AmbientOrbs } from '@/components/ambient-orbs';
import { buildNavigationTheme } from '@/constants/navigationTheme';
import { AppThemeProvider, useAppTheme } from '@/context/AppThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { GroupProvider } from '@/context/GroupContext';
import { ToastProvider } from '@/context/ToastContext';

function AppTree() {
  const { theme, showAmbientOrbs } = useAppTheme();
  const hex = theme.background.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const statusBarStyle = luminance > 0.56 ? 'dark' : 'light';
  const navTheme = buildNavigationTheme({
    primary: theme.primary,
    background: theme.background,
    card: theme.card,
    text: theme.text,
    border: theme.border,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: theme.background }}>
        <LinearGradient
          colors={[theme.background, theme.card, theme.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ ...StyleSheet.absoluteFillObject, opacity: 0.55 }}
          pointerEvents="none"
        />
        {showAmbientOrbs ? <AmbientOrbs /> : null}
        <View style={{ flex: 1, zIndex: 1 }}>
          <BottomSheetModalProvider>
            <AuthProvider>
              <ToastProvider>
                <GroupProvider>
                  <ThemeProvider value={navTheme}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(app)" />
                    </Stack>
                    <StatusBar style={statusBarStyle} />
                  </ThemeProvider>
                </GroupProvider>
              </ToastProvider>
            </AuthProvider>
          </BottomSheetModalProvider>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const app = (
    <AppThemeProvider>
      <AppTree />
    </AppThemeProvider>
  );
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, width: '100%', height: '100%', alignItems: 'stretch', backgroundColor: '#000' }}>
        <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
          {app}
        </View>
      </View>
    );
  }
  return app;
}
