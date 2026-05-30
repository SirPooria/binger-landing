import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

type Weight = 'regular' | 'bold' | 'black';

const fontFor: Record<Weight, string> = {
  regular: fonts.vazir,
  bold: 'Vazirmatn-Bold',
  black: 'Vazirmatn-Black',
};

interface AppTextProps extends TextProps {
  weight?: Weight;
}

/** Text that always uses Vazirmatn + RTL writing direction. Use everywhere. */
export function AppText({ weight = 'regular', style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        { fontFamily: fontFor[weight] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
