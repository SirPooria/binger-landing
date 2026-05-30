import { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Pin, EyeOff, MessageSquare, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../ui/AppText';
import { FORUM_CATEGORIES, fetchThreads, type ForumSort, type ForumThread } from '@/lib/forums';
import { relativeTimeFa, toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

const SORTS: { key: ForumSort; label: string }[] = [
  { key: 'newest', label: 'جدیدترین' },
  { key: 'popular', label: 'محبوب‌ترین' },
  { key: 'hot', label: 'داغ‌ترین' },
];

export function ForumSection({ showId }: { showId: number }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<ForumSort>('newest');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['forums', showId, category, sort],
    queryFn: () => fetchThreads(showId, category, sort),
  });

  const reveal = (id: string) => setRevealed((prev) => new Set(prev).add(id));

  return (
    <View>
      <View style={styles.filterRow}>
        <Pressable onPress={() => setCategory(null)} style={[styles.chip, !category && styles.chipActive]}>
          <AppText style={{ color: !category ? colors.accent : colors.muted, fontSize: 13 }}>همه</AppText>
        </Pressable>
        {FORUM_CATEGORIES.map((c) => (
          <Pressable key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}>
            <AppText style={{ color: category === c.key ? colors.accent : colors.muted, fontSize: 13 }}>{c.label}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <Pressable key={s.key} onPress={() => setSort(s.key)}>
            <AppText weight={sort === s.key ? 'bold' : 'regular'} style={{ color: sort === s.key ? colors.text : colors.muted, fontSize: 12 }}>
              {s.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.createBtn} onPress={() => router.push(`/forum/create?showId=${showId}`)}>
        <Plus size={18} color={colors.accent} />
        <AppText weight="bold" style={{ color: colors.accent }}>ساختن بحث جدید</AppText>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        (data ?? []).map((t: ForumThread) => {
          const blurred = t.is_spoiler && !revealed.has(t.id);
          return (
            <Pressable key={t.id} style={styles.thread} onPress={() => (blurred ? reveal(t.id) : router.push(`/forum/${t.id}`))}>
              <View style={styles.threadHeader}>
                {t.is_pinned && <Pin size={14} color={colors.accent} />}
                <AppText weight="bold" style={[styles.threadTitle, blurred && styles.blurred]} numberOfLines={1}>
                  {blurred ? '⚠️ این بحث اسپویل دارد — برای دیدن بزن' : t.title}
                </AppText>
              </View>
              {!blurred && <AppText style={styles.threadBody} numberOfLines={2}>{t.body}</AppText>}
              <View style={styles.threadMeta}>
                <View style={styles.metaItem}>
                  <MessageSquare size={13} color={colors.muted} />
                  <AppText style={styles.metaText}>{toFarsiDigits(t.replies_count)}</AppText>
                </View>
                {t.is_spoiler && <EyeOff size={13} color={colors.muted} />}
                <AppText style={styles.metaText}>{t.profiles?.username ?? 'کاربر'}</AppText>
                <AppText style={styles.metaText}>{relativeTimeFa(t.created_at)}</AppText>
              </View>
            </Pressable>
          );
        })
      )}
      {!isLoading && (data ?? []).length === 0 && <AppText style={styles.empty}>هنوز بحثی نیست. اولین نفر باش!</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { borderWidth: 1, borderColor: colors.accent },
  sortRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16,
    borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radii.lg, padding: 12,
  },
  thread: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  threadTitle: { fontSize: 15, flex: 1 },
  blurred: { color: colors.muted },
  threadBody: { color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 20 },
  threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: 24 },
});
