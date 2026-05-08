import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowTabBar } from '@/components/glow-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/context/AppThemeContext';

export default function AppTabsLayout() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 72 + insets.bottom;
  return (
    <Tabs
      screenOptions={{
        tabBar: (props) => <GlowTabBar {...props} />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '600',
          marginBottom: 2,
          includeFontPadding: false,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 8,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight + 4,
          paddingTop: 8,
          paddingBottom: Math.max(12, insets.bottom),
        },
        tabBarIconStyle: { marginTop: 1, marginBottom: 1 },
        tabBarItemStyle: { borderRadius: 18, paddingTop: 1, paddingBottom: 1 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="flame.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Archive',
          tabBarLabel: ({ color }) => (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={{ color, fontSize: 11, fontWeight: '600', lineHeight: 14, includeFontPadding: false }}>
              Archive
            </Text>
          ),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="square.stack.3d.up.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scoreboards"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="shopping-cart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          title: 'Group',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.crop.circle" color={color} />,
        }}
      />
    </Tabs>
  );
}
