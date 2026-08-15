import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { Loading } from '@/components/ui';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'inventory', title: 'Items', icon: 'list-outline', iconActive: 'list' },
  { name: 'history', title: 'History', icon: 'time-outline', iconActive: 'time' },
  { name: 'report', title: 'Report', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

export default function TabsLayout() {
  const { status, user } = useAuth();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  if (status === 'loading') return <Loading />;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (!user?.hasBusiness) return <Redirect href="/setup" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.colors.brand,
        tabBarInactiveTintColor: t.colors.inkFaint,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.hairline,
          borderTopWidth: 1,
          // A 22px icon plus a 16px label needs ~64pt of usable height; at the old 56 the
          // labels rendered but were clipped off the bottom of the bar.
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: (insets.bottom > 0 ? insets.bottom : 0) + 8,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 0 },
        headerStyle: { backgroundColor: t.colors.canvas },
        headerTintColor: t.colors.ink,
        headerTitleStyle: { ...t.text.subhead, color: t.colors.ink },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: t.colors.canvas },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Home and Report print their own header on the receipt; a nav bar above it
            // would just repeat the title.
            headerShown: tab.name !== 'index' && tab.name !== 'report',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} color={color} size={22} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
