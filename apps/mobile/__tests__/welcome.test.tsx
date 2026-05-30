import React from 'react';
import { render, screen } from '@testing-library/react-native';

const pushMock = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

jest.mock('@/lib/tmdbClient', () => ({
  getTrendingShows: jest.fn().mockResolvedValue([]),
  getImageUrl: () => null,
}));

import WelcomeScreen from '@/app/(auth)/welcome';

describe('WelcomeScreen', () => {
  it('renders the call-to-action "شروع کنیم؟"', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('شروع کنیم؟')).toBeTruthy();
  });

  it('renders the headline and free/no-ads tags', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('خوره‌های سریال')).toBeTruthy();
    expect(screen.getByText('همیشه رایگان')).toBeTruthy();
    expect(screen.getByText('بدون تبلیغات')).toBeTruthy();
  });
});
