import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { fetchActiveStories } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';

const STORY_DURATION = 5000;

export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>(); // user_id whose stories to view
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const { data } = useQuery({ queryKey: ['stories'], queryFn: fetchActiveStories });
  const group = data?.find((g) => g.user_id === id);
  const stories = group?.stories ?? [];
  const current = stories[index];

  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) next();
    });
    // Record a view.
    if (me) supabase.from('story_views').upsert({ story_id: current.id, viewer_id: me.id }).then(() => {});
    return () => anim.stop();
  }, [index, current?.id]);

  const next = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else router.back();
  };
  const prev = () => {
    if (index > 0) setIndex((i) => i - 1);
    else router.back();
  };

  if (!current) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <AppText style={{ color: colors.muted }}>استوری‌ای موجود نیست.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {current.image_url ? (
        <Image source={{ uri: current.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      )}

      <View style={[styles.progressRow, { width: width - 24 }]}>
        {stories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: i < index ? '100%' : i === index ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' },
              ]}
            />
          </View>
        ))}
      </View>

      {!!current.text_overlay && (
        <View style={styles.overlay}>
          <AppText weight="black" style={styles.overlayText}>{current.text_overlay}</AppText>
        </View>
      )}

      {/* Tap zones: right = prev (RTL), left = next; swipe-down handled by back btn */}
      <Pressable style={[styles.tapZone, { right: 0, width: width * 0.35, height }]} onPress={prev} />
      <Pressable style={[styles.tapZone, { left: 0, width: width * 0.35, height }]} onPress={next} />
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <AppText weight="black" style={{ color: '#fff', fontSize: 22 }}>×</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressRow: { position: 'absolute', top: 50, alignSelf: 'center', flexDirection: 'row', gap: 4, zIndex: 10 },
  progressTrack: { flex: 1, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  overlay: { position: 'absolute', bottom: 120, left: 24, right: 24, alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: 24, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 8 },
  tapZone: { position: 'absolute', top: 0 },
  closeBtn: { position: 'absolute', top: 44, left: 16, zIndex: 20, padding: 8 },
});
