import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Sparkles, MessageCircle, ChevronLeft } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { ShowCard } from './ShowCard';
import { AiReasonSheet } from './AiReasonSheet';
import { useAiRecommendations, useAiRecsStatus, useGenerateAiRecommendations } from '@/hooks/useShows';
import { useAuthStore } from '@/stores/useAuthStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';
import type { AiRecommendation } from '@binger/shared';

export function AiRecommendationsRow() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useAiRecommendations(userId);
  const { data: status } = useAiRecsStatus(userId);
  const generate = useGenerateAiRecommendations(userId);
  const [activeReason, setActiveReason] = useState<AiRecommendation | null>(null);

  const watched = status?.watchedShows ?? 0;
  const min = status?.minRequired ?? 3;
  const ready = status?.ready ?? false;
  const progress = Math.min(watched / min, 1);
  const hasRecs = (data ?? []).filter((r) => r.show != null).length > 0;
  const showGenerate =
    ready &&
    !hasRecs &&
    (status?.quotaAvailable || status?.generationStatus === 'processing');
  const generating = generate.isPending || status?.generationStatus === 'processing';

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Sparkles size={18} color={colors.accent} />
        <AppText weight="black" style={styles.title}>پیشنهاد هوش مصنوعی برای تو</AppText>
      </View>

      <Pressable style={styles.moodCta} onPress={() => router.push('/ai/mood')}>
        <MessageCircle size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" style={{ fontSize: 13 }}>چت با Binger AI</AppText>
          <AppText style={styles.moodSub}>حس و حال یا «شبیه فلان سریال» — پیشنهاد فوری</AppText>
        </View>
        <ChevronLeft size={18} color={colors.muted} style={{ transform: [{ scaleX: -1 }] }} />
      </Pressable>

      {!ready && (
        <View style={styles.progressBox}>
          <AppText style={styles.progressTitle}>
            {toFarsiDigits(watched)} از {toFarsiDigits(min)} سریال برای پیشنهاد شخصی‌سازی‌شده
          </AppText>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <AppText style={styles.progressHint}>{status?.howToWatch}</AppText>
        </View>
      )}

      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : hasRecs ? (
        <FlashList
          horizontal
          data={data ?? []}
          estimatedItemSize={130}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.tmdb_id)}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) =>
            item.show ? (
              <ShowCard show={item.show} onLongPress={() => setActiveReason(item)} />
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyBox}>
          <AppText style={styles.empty}>
            {ready
              ? 'پیشنهادهای شخصی‌ات به‌زودی اینجا ظاهر می‌شوند. تا آن وقت از «چت با Binger AI» بالا پیشنهاد فوری بگیر.'
              : `با ${toFarsiDigits(min - watched)} سریال دیگر (هر کدام حداقل یک قسمت «دیده‌شده») پیشنهاد شخصی‌سازی‌شده فعال می‌شود.`}
          </AppText>
          {showGenerate && (
            <Pressable
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={() => generate.mutate()}
              disabled={generating || !status?.quotaAvailable}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <AppText weight="bold" style={styles.generateBtnText}>
                  دریافت پیشنهاد شخصی
                </AppText>
              )}
            </Pressable>
          )}
          {!ready && (
            <AppText style={styles.emptyNote}>
              لیست تماشا و امتیاز ستاره‌ای کمک می‌کنند، ولی فقط «دیده‌شده» در شمارش حساب می‌شود.
            </AppText>
          )}
        </View>
      )}

      {hasRecs && (
        <AppText style={styles.longPressHint}>نگه‌داشتن روی پوستر = دلیل پیشنهاد هوش مصنوعی</AppText>
      )}

      <AiReasonSheet recommendation={activeReason} onClose={() => setActiveReason(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 18 },
  moodCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  progressBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: { fontSize: 13, marginBottom: 8, color: colors.text },
  progressTrack: {
    height: 6,
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  progressHint: { fontSize: 11, lineHeight: 18, color: colors.muted },
  skeletonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  skeleton: { width: 120, height: 180, borderRadius: 12, backgroundColor: colors.card },
  emptyBox: { paddingHorizontal: 16, gap: 8 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 22 },
  emptyNote: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  generateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    minWidth: 160,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { fontSize: 13, color: '#000' },
  longPressHint: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
});
