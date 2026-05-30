import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LogOut, Award, Trophy } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { LevelBar } from '@/components/LevelBar';
import { CarouselRow } from '@/components/CarouselRow';
import { fetchProfileStats } from '@/lib/profile';
import { getShowDetails } from '@/lib/tmdbClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    qc.clear();
    router.replace('/(auth)/welcome');
  };
  const { data, isLoading } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: () => fetchProfileStats(user!.id),
    enabled: !!user?.id,
  });

  const favorites = useQuery({
    queryKey: ['favorite-shows', data?.favoriteShowIds],
    queryFn: async () => (await Promise.all((data?.favoriteShowIds ?? []).map((id) => getShowDetails(id).catch(() => null)))).filter(Boolean),
    enabled: !!data?.favoriteShowIds?.length,
  });

  if (isLoading) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </Screen>
    );
  }

  const p = data?.profile;

  return (
    <Screen noPadding>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.header}>
          <Image source={p?.avatar_url ? { uri: p.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <AppText weight="black" style={styles.name}>{p?.full_name ?? p?.username ?? 'کاربر بینجر'}</AppText>
            <AppText style={styles.username}>@{p?.username ?? '...'}</AppText>
          </View>
          <Pressable onPress={handleSignOut} hitSlop={10}>
            <LogOut size={22} color={colors.muted} />
          </Pressable>
        </View>

        {!!p?.bio && <AppText style={styles.bio}>{p.bio}</AppText>}

        <View style={{ marginVertical: 16 }}>
          <LevelBar xp={p?.xp ?? 0} />
        </View>

        <View style={styles.statsRow}>
          <Stat label="دیده‌شده" value={data?.watchedCount ?? 0} />
          <Stat label="دنبال‌شونده" value={data?.followingCount ?? 0} />
          <Stat label="دنبال‌کننده" value={data?.followersCount ?? 0} />
        </View>

        <Pressable style={styles.leaderboardBtn} onPress={() => router.push('/leaderboard')}>
          <Trophy size={18} color={colors.accent} />
          <AppText weight="bold" style={{ color: colors.accent }}>جدول امتیازات</AppText>
        </Pressable>

        <View style={styles.badgesSection}>
          <View style={styles.sectionTitleRow}>
            <Award size={18} color={colors.accent} />
            <AppText weight="black" style={styles.sectionTitle}>بج‌ها</AppText>
          </View>
          {data?.badges?.length ? (
            <View style={styles.badgesGrid}>
              {data.badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <AppText style={{ fontSize: 12 }}>{b}</AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText style={styles.empty}>هنوز بجی نگرفتی.</AppText>
          )}
        </View>

        {!!favorites.data?.length && (
          <View style={{ marginTop: 16 }}>
            <CarouselRow title="مورد علاقه‌ها" shows={favorites.data as any} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText weight="black" style={styles.statValue}>{toFarsiDigits(value)}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 999, backgroundColor: colors.card },
  name: { fontSize: 20 },
  username: { color: colors.muted, marginTop: 2 },
  bio: { color: colors.textMuted, marginTop: 12, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, color: colors.accent },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  leaderboardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16,
    backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  badgesSection: { marginTop: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  empty: { color: colors.textMuted },
});
