import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { COMMENT_REACTIONS } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export function ReactionPicker({ onPick }: { onPick: (r: string) => void }) {
  return (
    <View style={styles.container}>
      {COMMENT_REACTIONS.map((r) => (
        <Pressable key={r} onPress={() => onPick(r)} style={styles.btn} hitSlop={6}>
          <AppText style={{ fontSize: 24 }}>{r}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', gap: 6, backgroundColor: colors.cardAlt, borderRadius: radii.full,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
  },
  btn: { padding: 2 },
});
