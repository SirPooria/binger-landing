import { View, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { fetchSocialFeed } from '@/lib/social';
import { useAuthStore } from '@/stores/useAuthStore';
import { relativeTimeFa } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export default function SocialScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['social-feed', userId],
    queryFn: () => fetchSocialFeed(userId!),
    enabled: !!userId,
  });

  return (
    <Screen noPadding>
      <View style={styles.header}>
        <AppText weight="black" style={styles.title}>فید اجتماعی</AppText>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={data ?? []}
          estimatedItemSize={96}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable onPress={() => router.push(`/user/${item.user.id}`)} style={styles.userRow}>
                  <Image source={item.user.avatar_url ? { uri: item.user.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
                  <View>
                    <AppText weight="bold" style={{ fontSize: 14 }}>{item.user.username ?? 'کاربر'}</AppText>
                    <AppText style={styles.time}>{relativeTimeFa(item.created_at)}</AppText>
                  </View>
                </Pressable>
              </View>
              <Pressable onPress={() => item.show_id && router.push(`/tv/${item.show_id}`)}>
                <AppText style={styles.activity}>{item.text}</AppText>
              </Pressable>
              <View style={styles.actions}>
                <Pressable hitSlop={8} style={styles.action}><Heart size={18} color={colors.muted} /></Pressable>
                <Pressable hitSlop={8} style={styles.action}><MessageCircle size={18} color={colors.muted} /></Pressable>
                <Pressable hitSlop={8} style={styles.action}><Share2 size={18} color={colors.muted} /></Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <AppText style={styles.empty}>هنوز کسی رو دنبال نکردی. برو چند نفر رو پیدا کن!</AppText>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16 },
  title: { fontSize: 24, color: colors.accent },
  card: { backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.cardAlt },
  time: { color: colors.muted, fontSize: 11 },
  activity: { marginVertical: 12, fontSize: 14, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { padding: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
