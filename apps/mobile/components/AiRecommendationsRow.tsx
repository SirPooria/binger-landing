import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Sparkles } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { ShowCard } from './ShowCard';
import { AiReasonSheet } from './AiReasonSheet';
import { useAiRecommendations } from '@/hooks/useShows';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';
import type { AiRecommendation } from '@binger/shared';

export function AiRecommendationsRow() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useAiRecommendations(userId);
  const [activeReason, setActiveReason] = useState<AiRecommendation | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Sparkles size={18} color={colors.accent} />
        <AppText weight="black" style={styles.title}>پیشنهاد هوش مصنوعی برای تو</AppText>
      </View>

      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : (
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
              // Long-press reveals the AI's Persian reason.
              <ShowCard show={item.show} onLongPress={() => setActiveReason(item)} />
            ) : null
          }
          ListEmptyComponent={
            <AppText style={styles.empty}>
              هنوز پیشنهادی نداریم — چند سریال تماشا کن تا هوش مصنوعی بشناستت.
            </AppText>
          }
        />
      )}

      <AiReasonSheet recommendation={activeReason} onClose={() => setActiveReason(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 18 },
  skeletonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  skeleton: { width: 120, height: 180, borderRadius: 12, backgroundColor: colors.card },
  empty: { color: colors.textMuted, paddingHorizontal: 16, fontSize: 13 },
});
