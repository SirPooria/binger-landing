import { Tabs } from 'expo-router';
import { Home, Search, ListVideo, Users, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { colors, fonts } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.cardAlt,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.vazir, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'خانه', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'جستجو', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="lists"
        options={{ title: 'لیست‌ها', tabBarIcon: ({ color, size }) => <ListVideo color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="social"
        options={{ title: 'فید', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'پروفایل', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
