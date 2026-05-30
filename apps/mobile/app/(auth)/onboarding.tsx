import { useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check, Sparkles, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { getPopularShows, getImageUrl } from '@/lib/tmdbClient';
import { apiPost } from '@/lib/api';
import { completeOnboarding } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';
import type { TmdbShow } from '@binger/shared';

export default function Onboarding() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 5 : 3;
  const gap = 12;
  const cardW = (width - 32 - gap * (numColumns - 1)) / numColumns;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data, fetchNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['onboarding-popular'],
    queryFn: ({ pageParam }) => getPopularShows(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.length === 0 ? undefined : all.length + 1),
  });

  // De-duplicate across pages.
  const shows: TmdbShow[] = (() => {
    const map = new Map<number, TmdbShow>();
    data?.pages.flat().forEach((s) => map.has(s.id) || map.set(s.id, s));
    return Array.from(map.values());
  })();

  const toggle = (id: number) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFinish = async () => {
    if (selected.size === 0 || !user) return;
    setSubmitting(true);
    try {
      await apiPost('/watchlist/bulk', { show_ids: Array.from(selected) });
      const updated = await completeOnboarding();
      setUser(updated);
      router.replace('/(tabs)');
    } catch (e: any) {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <FlashList
        data={shows}
        numColumns={numColumns}
        estimatedItemSize={cardW * 1.5}
        keyExtractor={(item) => String(item.id)}
        onEndReached={() => fetchNextPage()}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.sparkle}>
              <Sparkles size={32} color={colors.accent} />
            </View>
            <AppText weight="black" style={styles.title}>چی دوست داری؟</AppText>
            <AppText style={styles.subtitle}>
              چند تا از سریال‌های مورد علاقه‌ت رو انتخاب کن تا هوش مصنوعی بینجر دستش بیاد چی بهت پیشنهاد بده.
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const poster = getImageUrl(item.poster_path);
          return (
            <Pressable onPress={() => toggle(item.id)} style={{ width: cardW, margin: gap / 2 }}>
              <View style={[styles.card, { height: cardW * 1.5 }, isSelected && styles.cardSelected]}>
                <Image source={poster ? { uri: poster } : undefined} contentFit="cover" style={[styles.poster, isSelected && { opacity: 0.4 }]} />
                {isSelected && (
                  <View style={styles.checkWrap}>
                    <View style={styles.check}>
                      <Check size={22} color="#000" strokeWidth={4} />
                    </View>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} /> : null}
      />

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleFinish}
          disabled={selected.size === 0 || submitting}
          style={[styles.finishBtn, selected.size === 0 && styles.finishBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <AppText weight="black" style={{ color: selected.size > 0 ? '#000' : colors.muted }}>
                {`${selected.size} تا انتخاب شد، بریم؟`}
              </AppText>
              <ArrowLeft size={20} color={selected.size > 0 ? '#000' : colors.muted} strokeWidth={3} />
            </>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginVertical: 24, gap: 8 },
  sparkle: {
    width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(204,255,0,0.1)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', marginBottom: 8,
  },
  title: { fontSize: 30 },
  subtitle: { color: colors.textMuted, textAlign: 'center', lineHeight: 24, fontSize: 14 },
  card: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.card },
  cardSelected: { borderWidth: 3, borderColor: colors.accent },
  poster: { width: '100%', height: '100%' },
  checkWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  check: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, alignItems: 'center' },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: radii.lg, backgroundColor: colors.accent,
  },
  finishBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
});
