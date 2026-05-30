import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({ parse: jest.fn(() => ({ queryParams: {} })) }));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: any) => selector({ signInWithTokens: jest.fn() }),
}));

jest.mock('@/lib/auth', () => ({ sendMagicLink: jest.fn().mockResolvedValue(undefined) }));

import LoginScreen from '@/app/(auth)/login';

describe('LoginScreen', () => {
  it('renders the back link to the welcome screen', () => {
    render(<LoginScreen />);
    expect(screen.getByText('بازگشت به صفحه اصلی')).toBeTruthy();
  });

  it('renders both login methods', () => {
    render(<LoginScreen />);
    expect(screen.getByText('ورود با گوگل')).toBeTruthy();
    expect(screen.getByText('ارسال لینک ورود')).toBeTruthy();
  });
});
