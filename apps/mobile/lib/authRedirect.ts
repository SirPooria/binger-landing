import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/** Where the API should redirect after Google OAuth or magic-link verify. */
export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  // Expo Go uses exp://…; dev/production builds use scheme from app.json (binger://).
  return Linking.createURL('auth/callback');
}
