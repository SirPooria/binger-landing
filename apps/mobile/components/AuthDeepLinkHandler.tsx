import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { parseAuthTokensFromUrl } from '@/lib/parseAuthCallback';

/** Completes login when the app opens from a magic-link or OAuth redirect (Expo Go / native). */
export function AuthDeepLinkHandler() {
  const router = useRouter();
  const signInWithTokens = useAuthStore((s) => s.signInWithTokens);
  const handling = useRef(false);

  useEffect(() => {
    const complete = async (url: string) => {
      if (handling.current || !url.includes('access_token')) return;
      const tokens = parseAuthTokensFromUrl(url);
      if (!tokens) return;

      handling.current = true;
      try {
        const user = await signInWithTokens(tokens.access, tokens.refresh);
        router.replace(user.onboarding_complete ? '/(tabs)' : '/(auth)/onboarding');
      } catch {
        router.replace('/(auth)/login');
      } finally {
        handling.current = false;
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) void complete(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      void complete(url);
    });

    return () => sub.remove();
  }, [router, signInWithTokens]);

  return null;
}
