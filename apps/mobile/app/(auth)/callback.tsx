import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';

/** Handles OAuth / magic-link redirects: ?access_token=...&refresh_token=... */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
  const signInWithTokens = useAuthStore((s) => s.signInWithTokens);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let access = params.access_token;
        let refresh = params.refresh_token;

        if (!access || !refresh) {
          const url = await Linking.getInitialURL();
          if (url) {
            const parsed = Linking.parse(url);
            access = parsed.queryParams?.access_token as string | undefined;
            refresh = parsed.queryParams?.refresh_token as string | undefined;
          }
        }

        if (!access || !refresh) {
          setError('ورود ناموفق بود.');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        const user = await signInWithTokens(access, refresh);
        router.replace(user.onboarding_complete ? '/(tabs)' : '/(auth)/onboarding');
      } catch (e: any) {
        setError(e.message ?? 'خطا در ورود');
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
