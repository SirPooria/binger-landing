import { useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui/AppText';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
import { apiPost } from '@/lib/api';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

const REACTIONS = ['❤️', '😂', '😱', '😭', '🔥', '🤯'];

export default function EpisodeScreen() {
  const { id, s, e } = useLocalSearchParams<{ id: string; s: string; e: string }>();
  const router = useRouter();
  const user = useAuthStore((st) => st.user);
  const [watched, setWatched] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const { data: ep, isLoading } = useQuery({
    queryKey: ['episode', id, s, e],
    queryFn: () => getEpisodeDetails(id, s, e),
  });

  const markWatched = async () => {
    if (!user || !ep) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWatched(true);
    await apiPost('/watched', { show_id: Number(id), episode_id: ep.id });
    await awardXp(user.id, 'watch_episode', String(ep.id));
  };

  const sendReaction = async (r: string) => {
    if (!user || !ep) return;
    setReaction(r);
    await apiPost('/episode-reactions', { episode_id: ep.id, reaction: r });
  };

  if (isLoading || !ep) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 220 }}>
        <Image source={{ uri: getImageUrl(ep.still_path) ?? undefined }} contentFit="cover" style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
      </View>

      <View style={{ padding: 16 }}>
        <AppText style={styles.epNumber}>
          {`فصل ${toFarsiDigits(s)} • قسمت ${toFarsiDigits(e)}`}
        </AppText>
        <AppText weight="black" style={styles.title}>{ep.name}</AppText>
        <AppText style={styles.overview}>{ep.overview || 'توضیحاتی موجود نیست.'}</AppText>

        <Pressable onPress={markWatched} style={[styles.watchedBtn, watched && styles.watchedBtnActive]}>
          <Check size={18} color={watched ? '#000' : colors.accent} />
          <AppText weight="bold" style={{ color: watched ? '#000' : colors.accent }}>
            {watched ? 'دیده شد ✓' : 'علامت‌گذاری به عنوان دیده‌شده'}
          </AppText>
        </Pressable>

        <View style={styles.reactions}>
          {REACTIONS.map((r) => (
            <Pressable key={r} onPress={() => sendReaction(r)} style={[styles.reaction, reaction === r && styles.reactionActive]}>
              <AppText style={{ fontSize: 26 }}>{r}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText weight="black" style={styles.commentsTitle}>نظرات این قسمت</AppText>
        <CommentsSection showId={Number(id)} episodeId={ep.id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 48, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 6 },
  epNumber: { color: colors.accent, fontSize: 13 },
  title: { fontSize: 22, marginTop: 6 },
  overview: { lineHeight: 26, marginTop: 12, color: colors.text },
  watchedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radii.md, paddingVertical: 12,
  },
  watchedBtnActive: { backgroundColor: colors.accent },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, justifyContent: 'center' },
  reaction: { padding: 6, borderRadius: radii.full },
  reactionActive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent },
  commentsTitle: { fontSize: 18, marginTop: 28, marginBottom: 16 },
});
