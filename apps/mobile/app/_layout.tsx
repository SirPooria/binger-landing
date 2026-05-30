// RTL must be forced BEFORE anything else renders.
import { I18nManager } from 'react-native';
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_700Bold,
  Vazirmatn_900Black,
} from '@expo-google-fonts/vazirmatn';
import '../global.css';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const [fontsLoaded] = useFonts({
    Vazirmatn: Vazirmatn_400Regular,
    'Vazirmatn-Bold': Vazirmatn_700Bold,
    'Vazirmatn-Black': Vazirmatn_900Black,
  });

  useEffect(() => {
    init();
  }, [init]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_left', // RTL-aware feel
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="tv/[id]/index" />
              <Stack.Screen name="tv/[id]/season/[s]/episode/[e]" />
              <Stack.Screen name="user/[id]" />
              <Stack.Screen name="category/[id]" />
            </Stack>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
