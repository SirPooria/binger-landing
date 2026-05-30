import { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Star, Plus, Check, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/AppText';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ForumSection } from '@/components/forum/ForumSection';
import { useShowDetails } from '@/hooks/useShows';
import { getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWatchlistStore } from '@/stores/useWatchlistStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

type Tab = 'info' | 'episodes' | 'comments' | 'forum';

export default function ShowDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = Number(id);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const { isInList, toggle, load, loaded } = useWatchlistStore();

  const { data: show, isLoading } = useShowDetails(id);
  const [tab, setTab] = useState<Tab>('info');
  const [myRating, setMyRating] = useState<number>(0);

  useEffect(() => {
    if (user && !loaded) load(user.id);
  }, [user, loaded, load]);

  useEffect(() => {
    if (!user) return;
    apiGet<{ rating: number } | null>(`/ratings/${showId}`)
      .then((data) => data && setMyRating(data.rating))
      .catch(() => {});
  }, [user, showId]);

  const rate = async (rating: number) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMyRating(rating);
    await apiPut('/ratings', { show_id: showId, rating });
    await awardXp(user.id, 'rate_show', String(showId));
  };

  if (isLoading || !show) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const inList = isInList(showId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: width * 0.62 }}>
          <Image source={{ uri: getBackdropUrl(show.backdrop_path) }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(5,5,5,0.2)', colors.background]} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <ChevronRight size={26} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <Image source={{ uri: getImageUrl(show.poster_path) ?? undefined }} style={styles.poster} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <AppText weight="black" style={styles.title}>{show.name}</AppText>
            {!!show.first_air_date && <AppText style={styles.year}>{toFarsiDigits(show.first_air_date.slice(0, 4))}</AppText>}
            {typeof show.vote_average === 'number' && (
              <View style={styles.tmdbRating}>
                <Star size={14} color={colors.accent} fill={colors.accent} />
                <AppText weight="bold" style={{ color: colors.accent }}>{show.vote_average.toFixed(1)}</AppText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={() => user && toggle(user.id, showId)} style={[styles.actionBtn, inList && styles.actionBtnActive]}>
            {inList ? <Check size={18} color="#000" /> : <Plus size={18} color={colors.accent} />}
            <AppText weight="bold" style={{ color: inList ? '#000' : colors.accent }}>
              {inList ? 'در لیست تماشا' : 'افزودن به لیست'}
            </AppText>
          </Pressable>
          <Pressable onPress={() => user && apiPost('/favorites', { show_id: showId })} style={styles.iconBtn}>
            <Heart size={20} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.ratingRow}>
          <AppText style={{ color: colors.muted }}>امتیاز تو:</AppText>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => rate(n)} hitSlop={4}>
              <Star size={26} color={colors.accent} fill={n <= myRating ? colors.accent : 'transparent'} />
            </Pressable>
          ))}
        </View>

        <View style={styles.tabs}>
          {(['info', 'episodes', 'comments', 'forum'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
              <AppText weight={tab === t ? 'black' : 'regular'} style={{ color: tab === t ? colors.accent : colors.muted, fontSize: 13 }}>
                {{ info: 'اطلاعات', episodes: 'قسمت‌ها', comments: 'نظرات', forum: 'انجمن' }[t]}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {tab === 'info' && (
            <View>
              {!!show.tagline && <AppText style={styles.tagline}>{show.tagline}</AppText>}
              <AppText style={styles.overview}>{show.overview || 'توضیحاتی موجود نیست.'}</AppText>
              {!!show.genres?.length && (
                <View style={styles.genres}>
                  {show.genres.map((g) => (
                    <View key={g.id} style={styles.genreChip}>
                      <AppText style={{ fontSize: 12, color: colors.textMuted }}>{g.name}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {tab === 'episodes' &&
            (show.seasons ?? [])
              .filter((s) => s.season_number > 0)
              .map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.season}
                  onPress={() => router.push(`/tv/${showId}/season/${s.season_number}/episode/1`)}
                >
                  <Image source={{ uri: getImageUrl(s.poster_path) ?? undefined }} style={styles.seasonPoster} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold">{s.name}</AppText>
                    <AppText style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                      {toFarsiDigits(s.episode_count ?? 0)} قسمت
                    </AppText>
                  </View>
                  <ChevronRight size={20} color={colors.muted} style={{ transform: [{ scaleX: -1 }] }} />
                </Pressable>
              ))}

          {tab === 'comments' && <CommentsSection showId={showId} />}
          {tab === 'forum' && <ForumSection showId={showId} />}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 48, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 6 },
  headerRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: -50 },
  poster: { width: 100, height: 150, borderRadius: radii.md, backgroundColor: colors.card },
  title: { fontSize: 22, marginTop: 50 },
  year: { color: colors.muted, marginTop: 4 },
  tmdbRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radii.md, paddingVertical: 12,
  },
  actionBtnActive: { backgroundColor: colors.accent },
  iconBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 20, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.full },
  tabBtnActive: { backgroundColor: colors.card },
  tagline: { color: colors.accent, fontStyle: 'italic', marginBottom: 12 },
  overview: { lineHeight: 26, fontSize: 15, color: colors.text },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  genreChip: { backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 6 },
  season: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radii.md, padding: 10, marginBottom: 10 },
  seasonPoster: { width: 48, height: 72, borderRadius: radii.sm, backgroundColor: colors.cardAlt },
});
