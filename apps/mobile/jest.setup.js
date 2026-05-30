/* Test environment mocks for native/Expo modules. */

// AsyncStorage in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated: replace with lightweight no-op implementations so screens render
// synchronously under jest without the native worklet runtime.
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  const passthrough = (v) => v;
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c) => c },
    View,
    Text,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: passthrough,
    withSpring: passthrough,
    withRepeat: passthrough,
    withDelay: (_d, v) => v,
    withSequence: (...args) => args[0],
    Easing: { linear: () => {}, inOut: () => () => {}, ease: () => {}, out: () => () => {} },
    FadeInDown: { duration: () => ({}), delay: () => ({ duration: () => ({}) }) },
    FadeIn: { duration: () => ({}) },
  };
});

// SafeAreaContext: render plain views and report zero insets.
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Haptics is fire-and-forget.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
