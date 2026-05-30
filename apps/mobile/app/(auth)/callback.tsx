import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { parseAuthCallbackTokens } from '@/lib/parseAuthCallback';
import { colors } from '@/constants/theme';

/** Handles OAuth / magic-link redirects: ?access_token=...&refresh_token=... */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string | string[]; refresh_token?: string | string[] }>();
  const signInWithTokens = useAuthStore((s) => s.signInWithTokens);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const tokens = await parseAuthCallbackTokens(params);
        if (!tokens) {
          setError('ورود ناموفق بود.');
          setTimeout(() => router.replace('/(auth)/login'), 2000);
          return;
        }

        const user = await signInWithTokens(tokens.access, tokens.refresh);

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }

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
