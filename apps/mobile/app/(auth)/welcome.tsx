import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Tv, ArrowLeft } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { getTrendingShows, getImageUrl } from '@/lib/tmdbClient';
import { colors, radii } from '@/constants/theme';

const POSTER_W = 104;
const POSTER_H = 156;
const GAP = 12;

/** One horizontally-looping row of posters. Mirrors the web `animate-marquee` rows. */
function MarqueeRow({
  posters,
  reverse,
  duration,
  topOffset,
}: {
  posters: string[];
  reverse?: boolean;
  duration: number;
  topOffset: number;
}) {
  const setWidth = posters.length * (POSTER_W + GAP);
  const x = useSharedValue(reverse ? -setWidth : 0);

  useEffect(() => {
    const from = reverse ? -setWidth : 0;
    const to = reverse ? 0 : -setWidth;
    x.value = from;
    x.value = withRepeat(withTiming(to, { duration, easing: Easing.linear }), -1, false);
  }, [setWidth, duration, reverse, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // Render the set twice so the loop is seamless.
  const doubled = useMemo(() => [...posters, ...posters], [posters]);

  return (
    <Animated.View style={[styles.row, { top: topOffset }, style]}>
      {doubled.map((src, i) => (
        <View key={`${src}-${i}`} style={styles.poster}>
          <Image source={{ uri: src }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
        </View>
      ))}
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p1, p2] = await Promise.all([getTrendingShows(1), getTrendingShows(2)]);
        const urls = [...p1, ...p2]
          .map((s) => getImageUrl(s.poster_path))
          .filter((u): u is string => !!u);
        if (active && urls.length) setPosters(urls.slice(0, 12));
      } catch {
        // Posters are decorative; ignore failures.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const displayPosters = posters.length > 0 ? posters : new Array(8).fill('');

  // Spring entrance for the logo tile (mirrors framer-motion spring, damping 12).
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(-180);
  useEffect(() => {
    iconScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 120 }));
    iconRotate.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 120 }));
  }, [iconScale, iconRotate]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { rotate: `${iconRotate.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      {/* Background poster wall (decorative, dimmed) */}
      <View style={styles.posterWall} pointerEvents="none">
        <View style={styles.rotated}>
          {displayPosters.some(Boolean) && (
            <>
              <MarqueeRow posters={displayPosters} duration={60000} topOffset={-40} />
              <MarqueeRow posters={displayPosters} duration={70000} topOffset={height * 0.34} reverse />
            </>
          )}
        </View>
        <LinearGradient
          colors={['rgba(5,5,5,0.2)', 'rgba(5,5,5,0.9)', colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Foreground content — CTA outside FadeInDown (iOS could leave children at opacity 0). */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Animated.View entering={FadeInDown.duration(800)} style={styles.heroBlock}>
          <Animated.View style={[styles.iconTile, iconStyle]}>
            <Tv size={48} color="#000000" strokeWidth={2.5} />
          </Animated.View>

          <View style={styles.headingBlock}>
            <AppText weight="black" style={styles.title}>
              دستیار شخصیِ
            </AppText>
            <AppText weight="black" style={[styles.title, { color: colors.accent }]}>
              خوره‌های سریال
            </AppText>
            <AppText style={styles.subtitle}>
              لیستت رو بساز، اپیزودها رو تیک بزن و بدون ترس از اسپویل نقد بخون.
            </AppText>
          </View>
        </Animated.View>

        <View style={styles.ctaBlock}>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="شروع کنیم"
            style={({ pressed }) => [styles.ctaPressable, pressed && styles.ctaPressed]}
          >
            <LinearGradient
              colors={['#ccff00', '#b3e600']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>شروع کنیم؟</Text>
              <ArrowLeft size={24} color="#000000" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>

          <View style={styles.tags}>
            <AppText style={styles.tag}>همیشه رایگان</AppText>
            <View style={styles.tagDot} />
            <AppText style={styles.tag}>بدون تبلیغات</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  posterWall: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  rotated: { ...StyleSheet.absoluteFillObject, transform: [{ rotate: '12deg' }, { scale: 1.3 }] },
  row: { position: 'absolute', left: -40, flexDirection: 'row', gap: GAP },
  poster: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    zIndex: 10,
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 32,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  heroBlock: { alignItems: 'center', width: '100%' },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  headingBlock: { alignItems: 'center', gap: 4 },
  title: { fontSize: 36, lineHeight: 46, textAlign: 'center' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 280,
  },
  ctaBlock: { width: '100%', marginTop: 40, gap: 16 },
  ctaPressable: { width: '100%', borderRadius: radii.xl, overflow: 'hidden' },
  ctaGradient: {
    width: '100%',
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  ctaText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Vazirmatn-Bold',
    writingDirection: 'rtl',
  },
  tags: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  tag: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tagDot: { width: 4, height: 4, borderRadius: 999, backgroundColor: colors.muted },
});
