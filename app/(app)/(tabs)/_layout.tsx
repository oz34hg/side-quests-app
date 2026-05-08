import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Mocha } from '@/constants/mocha';

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Mocha.blue,
        tabBarInactiveTintColor: Mocha.fg4,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: Mocha.bg1,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: Mocha.crust,
          shadowOpacity: 0.45,
          shadowOffset: { width: 0, height: -6 },
          shadowRadius: 16,
          height: 58,
          paddingTop: 4,
        },
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
