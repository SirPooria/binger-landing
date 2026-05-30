import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Screen({ children, edges = ['top'], style, noPadding }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[{ flex: 1, paddingHorizontal: noPadding ? 0 : 16 }, style]}>{children}</View>
    </SafeAreaView>
  );
}
