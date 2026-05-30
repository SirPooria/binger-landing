import { TextInput, Platform, StyleSheet, type TextInputProps } from 'react-native';
import { colors, radii } from '@/constants/theme';

type Variant = 'plain' | 'bordered';

export interface RtlTextInputProps extends TextInputProps {
  variant?: Variant;
}

export function RtlTextInput({ variant = 'plain', style, textAlign, ...props }: RtlTextInputProps) {
  return (
    <TextInput
      underlineColorAndroid="transparent"
      {...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {})}
      textAlign={textAlign ?? 'right'}
      placeholderTextColor={props.placeholderTextColor ?? colors.muted}
      style={[styles.base, variant === 'bordered' ? styles.bordered : undefined, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    color: colors.white,
    fontFamily: 'Vazirmatn',
  },
  bordered: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    color: colors.white,
    fontFamily: 'Vazirmatn',
  },
});
