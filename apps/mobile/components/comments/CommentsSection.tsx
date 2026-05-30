import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Send, ImagePlus, Smile, Camera } from 'lucide-react-native';
import { AppText } from '../ui/AppText';
import { RtlTextInput } from '../ui/RtlTextInput';
import { ReactionPicker } from './ReactionPicker';
import { fetchComments, postComment, toggleReaction, attachMedia, type CommentRow } from '@/lib/comments';
import { uploadImageAsync } from '@/lib/upload';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const composerRef = useRef<View>(null);

  const refresh = () => qc.invalidateQueries({ queryKey });

  /** Thread replies attach to the top-level comment (two-level threading). */
  const startReply = (c: CommentRow) => {
    const parentId = c.parent_id ? Number(c.parent_id) : Number(c.id);
    if (!Number.isFinite(parentId)) return;
    setReplyTo(parentId);
    setError('');
    requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        const node = composerRef.current as unknown as { scrollIntoView?: (o: ScrollIntoViewOptions) => void } | null;
        node?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };

  const submit = async () => {
    if (submitting) return;
    if (!user) {
      setError('برای ارسال نظر باید وارد حساب شوی.');
      return;
    }
    if (!text.trim() && !pendingImage) {
      setError('متن نظر را بنویس.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await postComment({
        showId,
        episodeId,
        content: text.trim() || undefined,
        parentId: replyTo ?? undefined,
      });
      const commentId = Number(created?.id);
      if (!Number.isFinite(commentId)) {
        throw new Error('ثبت نظر ناموفق بود — پاسخ سرور نامعتبر.');
      }
      if (pendingImage) {
        const uploadedUrl = await uploadImageAsync(pendingImage);
        await attachMedia(commentId, 'image', uploadedUrl, uploadedUrl, showId, episodeId);
      }
      // XP is best-effort — must not fail the comment/reply after a successful insert
      try {
        await awardXp(user.id, 'comment', String(commentId));
      } catch {
        /* ignore */
      }
      setText('');
      setReplyTo(null);
      setPendingImage(null);
      setError('');
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ارسال نظر ناموفق بود.';
      if (msg.includes('invalid_body') || msg.includes('API error 400')) {
        setError('ارسال پاسخ ناموفق بود. صفحه را رفرش کنید و دوباره تلاش کنید.');
      } else {
        setError(msg.includes('JSON') ? 'خطا در ارتباط با سرور. Metro و Docker را بررسی کنید.' : msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web') return;
    const { key, shiftKey } = e.nativeEvent;
    if (key === 'Enter' && !shiftKey) {
      e.preventDefault?.();
      void submit();
    }
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
            <Pressable onPress={() => startReply(c)}>
              <AppText style={styles.actionLink}>پاسخ</AppText>
            </Pressable>
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

  const composer = (
    <View ref={composerRef} style={styles.composer}>
      {pendingImage && <Image source={{ uri: pendingImage }} style={styles.pendingImage} contentFit="cover" />}
      {replyTo != null && (
        <Pressable onPress={() => { setReplyTo(null); setError(''); }}>
          <AppText style={styles.replyingTo}>در حال پاسخ به نظر — لغو</AppText>
        </Pressable>
      )}
      {!!error && <AppText style={styles.errorText}>{error}</AppText>}
      <View style={styles.composerRow}>
        <Pressable onPress={pickImage} hitSlop={6} disabled={submitting}><ImagePlus size={20} color={colors.muted} /></Pressable>
        <Pressable hitSlop={6}><Camera size={20} color={colors.muted} /></Pressable>
        <Pressable hitSlop={6}><Smile size={20} color={colors.muted} /></Pressable>
        <RtlTextInput
          value={text}
          onChangeText={(v) => { setText(v); if (error) setError(''); }}
          placeholder={replyTo != null ? 'پاسخت رو بنویس...' : 'نظرت رو بنویس...'}
          onKeyPress={handleKeyPress}
          blurOnSubmit={false}
          style={styles.input}
          multiline
          editable={!submitting}
        />
        <Pressable onPress={() => void submit()} hitSlop={6} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color={colors.accent} /> : <Send size={20} color={colors.accent} />}
        </Pressable>
      </View>
      {Platform.OS === 'web' && <AppText style={styles.enterHint}>Enter برای ارسال • Shift+Enter خط جدید</AppText>}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.list}>
          {(data ?? []).map((c) => renderComment(c))}
          {(data ?? []).length === 0 && <AppText style={styles.empty}>اولین نفری باش که نظر می‌ده!</AppText>}
        </View>
      )}
      {composer}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginBottom: 16 },
  composer: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: colors.white, fontFamily: 'Vazirmatn', maxHeight: 100 },
  pendingImage: { width: 80, height: 80, borderRadius: radii.md, marginBottom: 8 },
  replyingTo: { color: colors.accent, fontSize: 12, marginBottom: 8 },
  errorText: { color: '#f87171', fontSize: 12, marginBottom: 8 },
  enterHint: { color: colors.muted, fontSize: 10, marginTop: 6, textAlign: 'right' },
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
