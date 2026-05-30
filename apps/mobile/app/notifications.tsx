import { useEffect } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Bell } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { fetchNotifications, markNotificationsRead } from '@/lib/social';
import { useAuthStore } from '@/stores/useAuthStore';
import { relativeTimeFa } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (userId) markNotificationsRead(userId);
  }, [userId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={styles.title}>اعلان‌ها</AppText>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={data ?? []}
          estimatedItemSize={72}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }: any) => (
            <View style={[styles.item, !item.is_read && styles.itemUnread]}>
              {item.sender?.avatar_url ? (
                <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.iconAvatar]}>
                  <Bell size={18} color={colors.accent} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, lineHeight: 22 }}>{item.message}</AppText>
                <AppText style={styles.time}>{relativeTimeFa(item.created_at)}</AppText>
              </View>
            </View>
          )}
          ListEmptyComponent={<AppText style={styles.empty}>اعلانی نداری.</AppText>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderRadius: radii.lg, padding: 14 },
  itemUnread: { borderWidth: 1, borderColor: colors.accent },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.cardAlt },
  iconAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(204,255,0,0.1)' },
  time: { color: colors.muted, fontSize: 11, marginTop: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
