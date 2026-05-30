import { Pressable, View, StyleSheet, DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppText } from './ui/AppText';
import { getImageUrl } from '@/lib/tmdbClient';
import { colors, radii } from '@/constants/theme';
import type { TmdbShow } from '@binger/shared';

interface ShowCardProps {
  show: TmdbShow;
  width?: number;
  onLongPress?: () => void;
  showTitle?: boolean;
}

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function ShowCard({ show, width = 120, onLongPress, showTitle = true }: ShowCardProps) {
  const router = useRouter();
  const poster = getImageUrl(show.poster_path);

  return (
    <Pressable
      onPress={() => router.push(`/tv/${show.id}`)}
      onLongPress={() => {
        if (onLongPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }
      }}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.posterWrap, { width, height: width * 1.5 }]}>
        <Image
          source={poster ? { uri: poster } : undefined}
          placeholder={{ blurhash: BLURHASH }}
          contentFit="cover"
          transition={200}
          cachePolicy="disk"
          style={styles.poster}
        />
        {typeof show.vote_average === 'number' && show.vote_average > 0 && (
          <View style={styles.rating}>
            <AppText weight="bold" style={styles.ratingText}>
              {show.vote_average.toFixed(1)}
            </AppText>
          </View>
        )}
      </View>
      {showTitle && (
        <AppText numberOfLines={1} weight="bold" style={styles.title}>
          {show.name}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  posterWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: { width: '100%' as DimensionValue, height: '100%' as DimensionValue },
  title: { marginTop: 6, fontSize: 12, textAlign: 'center' },
  rating: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: { color: colors.accent, fontSize: 11 },
});
