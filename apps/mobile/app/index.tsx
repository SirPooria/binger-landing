import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';

export default function Index() {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)/welcome'} />;
}
