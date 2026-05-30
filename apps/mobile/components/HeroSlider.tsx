import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppText } from './ui/AppText';
import { getBackdropUrl } from '@/lib/tmdbClient';
import { colors, radii } from '@/constants/theme';
import type { TmdbShow } from '@binger/shared';

export function HeroSlider({ shows }: { shows: TmdbShow[] }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const slides = shows.slice(0, 5);
  const heroH = Math.min(420, width * 1.05);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  if (slides.length === 0) return null;

  return (
    <View style={{ height: heroH, marginBottom: 24 }}>
      <FlashList
        horizontal
        pagingEnabled
        data={slides}
        estimatedItemSize={width}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/tv/${item.id}`)} style={{ width, height: heroH }}>
            <Image source={{ uri: getBackdropUrl(item.backdrop_path) }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.6)', colors.background]} style={StyleSheet.absoluteFill} />
            <View style={styles.caption}>
              <AppText weight="black" style={styles.captionTitle} numberOfLines={2}>
                {item.name}
              </AppText>
              {!!item.overview && (
                <AppText style={styles.captionText} numberOfLines={2}>
                  {item.overview}
                </AppText>
              )}
            </View>
          </Pressable>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { position: 'absolute', bottom: 36, right: 16, left: 16 },
  captionTitle: { fontSize: 26 },
  captionText: { color: colors.textMuted, marginTop: 6, fontSize: 13, lineHeight: 20 },
  dots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.accent, width: 18 },
});
