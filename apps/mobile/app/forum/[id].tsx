import { useState } from 'react';
import { ScrollView, View, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Send } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { fetchForum, fetchReplies, postReply } from '@/lib/forums';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { relativeTimeFa } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export default function ThreadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const thread = useQuery({
    queryKey: ['forum-thread', id],
    queryFn: () => fetchForum(id),
  });
  const replies = useQuery({ queryKey: ['forum-replies', id], queryFn: () => fetchReplies(id) });

  const submit = async () => {
    if (!user || !reply.trim()) return;
    await postReply(id, reply.trim());
    await awardXp(user.id, 'forum_post', id);
    setReply('');
    qc.invalidateQueries({ queryKey: ['forum-replies', id] });
  };

  if (thread.isLoading || !thread.data) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const t = thread.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={{ fontSize: 16, flex: 1, marginHorizontal: 12 }} numberOfLines={1}>
          {t.title}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.opCard}>
          <AppText weight="black" style={{ fontSize: 18 }}>{t.title}</AppText>
          <AppText style={styles.opBody}>{t.body}</AppText>
          <AppText style={styles.meta}>{`${t.profiles?.username ?? 'کاربر'} • ${relativeTimeFa(t.created_at)}`}</AppText>
        </View>

        <AppText weight="black" style={{ marginVertical: 16 }}>پاسخ‌ها</AppText>
        {(replies.data ?? []).map((r: any) => (
          <View key={r.id} style={styles.reply}>
            <Image source={r.profiles?.avatar_url ? { uri: r.profiles.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <AppText weight="bold" style={{ fontSize: 13 }}>{r.profiles?.username ?? 'کاربر'}</AppText>
              <AppText style={{ marginTop: 4, lineHeight: 22 }}>{r.body}</AppText>
              <AppText style={styles.meta}>{relativeTimeFa(r.created_at)}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput value={reply} onChangeText={setReply} placeholder="پاسخت رو بنویس..." placeholderTextColor={colors.muted} style={styles.input} multiline />
        <Pressable onPress={submit} hitSlop={6}><Send size={22} color={colors.accent} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  opCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 16 },
  opBody: { marginTop: 10, lineHeight: 26 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 8 },
  reply: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  avatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.card },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right', maxHeight: 100 },
});
