import { View, StyleSheet } from 'react-native';
import { AppText } from './ui/AppText';
import { levelForXp, levelProgress, xpToNextLevel, toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export function LevelBar({ xp }: { xp: number }) {
  const def = levelForXp(xp);
  const progress = levelProgress(xp);
  const toNext = xpToNextLevel(xp);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <AppText weight="black" style={styles.levelNum}>{toFarsiDigits(def.level)}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="black" style={styles.title}>{def.title}</AppText>
          <AppText style={styles.xpText}>
            {toNext > 0 ? `${toFarsiDigits(toNext)} XP تا سطح بعد` : 'بالاترین سطح!'}
          </AppText>
        </View>
        <AppText weight="bold" style={styles.xpValue}>{`${toFarsiDigits(xp)} XP`}</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelBadge: {
    width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(204,255,0,0.12)',
    borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  levelNum: { color: colors.accent, fontSize: 18 },
  title: { fontSize: 16 },
  xpText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  xpValue: { color: colors.accent, fontSize: 13 },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
});
