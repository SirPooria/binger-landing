import { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Send, ImagePlus, Smile, Camera } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { ReactionPicker } from './ReactionPicker';
import { fetchComments, postComment, toggleReaction, attachMedia, type CommentRow } from '@/lib/comments';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { relativeTimeFa } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

interface Props {
  showId?: number;
  episodeId?: number;
}

export function CommentsSection({ showId, episodeId }: Props) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const queryKey = ['comments', showId, episodeId];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchComments({ showId, episodeId }) });

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reactingTo, setReactingTo] = useState<number | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey });

  const submit = async () => {
    if (!user || (!text.trim() && !pendingImage)) return;
    const { data: created } = await postComment({
      userId: user.id,
      showId,
      episodeId,
      content: text.trim(),
      parentId: replyTo ?? undefined,
      email: user.email ?? undefined,
    });
    if (created && pendingImage) {
      await attachMedia(created.id, 'image', pendingImage, undefined, showId, episodeId);
    }
    await awardXp(user.id, 'comment', String(created?.id));
    setText('');
    setReplyTo(null);
    setPendingImage(null);
    refresh();
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPendingImage(res.assets[0].uri);
  };

  const react = async (commentId: number, reaction: string, active: boolean) => {
    if (!user) return;
    setReactingTo(null);
    await toggleReaction(user.id, commentId, reaction as any, active);
    refresh();
  };

  const renderComment = (c: CommentRow, isReply = false) => {
    const reactionCounts = (c.comment_reactions ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.reaction] = (acc[r.reaction] ?? 0) + 1;
      return acc;
    }, {});
    const myReactions = new Set((c.comment_reactions ?? []).filter((r) => r.user_id === user?.id).map((r) => r.reaction));

    return (
      <View key={c.id} style={[styles.comment, isReply && styles.reply]}>
        <Image source={c.profiles?.avatar_url ? { uri: c.profiles.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={styles.commentHeader}>
            <AppText weight="bold" style={{ fontSize: 13 }}>{c.profiles?.username ?? 'کاربر'}</AppText>
            <AppText style={styles.time}>{relativeTimeFa(c.created_at)}</AppText>
          </View>
          {!!c.content && <AppText style={styles.content}>{c.content}</AppText>}
          {c.comment_media?.map((m) => (
            <Image key={m.id} source={{ uri: m.thumbnail_url ?? m.url }} style={styles.media} contentFit="cover" />
          ))}

          <View style={styles.commentActions}>
            <Pressable onPress={() => setReactingTo(reactingTo === c.id ? null : c.id)}>
              <AppText style={styles.actionLink}>واکنش</AppText>
            </Pressable>
            {!isReply && (
              <Pressable onPress={() => setReplyTo(c.id)}>
                <AppText style={styles.actionLink}>پاسخ</AppText>
              </Pressable>
            )}
            {Object.entries(reactionCounts).map(([r, n]) => (
              <Pressable key={r} onPress={() => react(c.id, r, myReactions.has(r))} style={[styles.reactionChip, myReactions.has(r) && styles.reactionChipActive]}>
                <AppText style={{ fontSize: 12 }}>{`${r} ${n}`}</AppText>
              </Pressable>
            ))}
          </View>

          {reactingTo === c.id && (
            <View style={{ marginTop: 8 }}>
              <ReactionPicker onPick={(r) => react(c.id, r, myReactions.has(r))} />
            </View>
          )}

          {c.replies?.map((r) => renderComment(r, true))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Composer */}
      <View style={styles.composer}>
        {pendingImage && <Image source={{ uri: pendingImage }} style={styles.pendingImage} contentFit="cover" />}
        {replyTo && (
          <Pressable onPress={() => setReplyTo(null)}>
            <AppText style={styles.replyingTo}>در حال پاسخ به نظر — لغو</AppText>
          </Pressable>
        )}
        <View style={styles.composerRow}>
          <Pressable onPress={pickImage} hitSlop={6}><ImagePlus size={20} color={colors.muted} /></Pressable>
          <Pressable hitSlop={6}><Camera size={20} color={colors.muted} /></Pressable>
          <Pressable hitSlop={6}><Smile size={20} color={colors.muted} /></Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="نظرت رو بنویس..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable onPress={submit} hitSlop={6}><Send size={20} color={colors.accent} /></Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <View>
          {(data ?? []).map((c) => renderComment(c))}
          {(data ?? []).length === 0 && <AppText style={styles.empty}>اولین نفری باش که نظر می‌ده!</AppText>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right', maxHeight: 100 },
  pendingImage: { width: 80, height: 80, borderRadius: radii.md, marginBottom: 8 },
  replyingTo: { color: colors.accent, fontSize: 12, marginBottom: 8 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  reply: { marginRight: 24, marginTop: 12, marginBottom: 0 },
  avatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.card },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { color: colors.muted, fontSize: 11 },
  content: { marginTop: 4, lineHeight: 22, fontSize: 14 },
  media: { width: '100%', height: 180, borderRadius: radii.md, marginTop: 8 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  actionLink: { color: colors.muted, fontSize: 12 },
  reactionChip: { backgroundColor: colors.cardAlt, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 4 },
  reactionChipActive: { borderWidth: 1, borderColor: colors.accent },
  empty: { color: colors.textMuted, textAlign: 'center', marginVertical: 24 },
});
