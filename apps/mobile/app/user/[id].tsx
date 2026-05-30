import { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, UserPlus, UserCheck } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { LevelBar } from '@/components/LevelBar';
import { fetchProfileStats, isFollowing, toggleFollow } from '@/lib/profile';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['profile-stats', id], queryFn: () => fetchProfileStats(id) });

  useEffect(() => {
    if (me && id && me.id !== id) isFollowing(me.id, id).then(setFollowing);
  }, [me, id]);

  const onToggleFollow = async () => {
    if (!me) return;
    const was = following;
    setFollowing(!was);
    await toggleFollow(me.id, id, was);
    if (!was) await awardXp(id, 'followed', me.id);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const p = data?.profile;
  const isMe = me?.id === id;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <ChevronRight size={26} color={colors.white} />
      </Pressable>

      <View style={styles.header}>
        <Image source={p?.avatar_url ? { uri: p.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
        <AppText weight="black" style={styles.name}>{p?.full_name ?? p?.username ?? 'کاربر'}</AppText>
        <AppText style={styles.username}>@{p?.username ?? '...'}</AppText>
        {!!p?.bio && <AppText style={styles.bio}>{p.bio}</AppText>}
      </View>

      {!isMe && (
        <Pressable onPress={onToggleFollow} style={[styles.followBtn, following && styles.followBtnActive]}>
          {following ? <UserCheck size={18} color="#000" /> : <UserPlus size={18} color={colors.accent} />}
          <AppText weight="bold" style={{ color: following ? '#000' : colors.accent }}>
            {following ? 'دنبال می‌کنی' : 'دنبال کردن'}
          </AppText>
        </Pressable>
      )}

      <View style={{ marginVertical: 16 }}>
        <LevelBar xp={p?.xp ?? 0} />
      </View>

      <View style={styles.statsRow}>
        <Stat label="دیده‌شده" value={data?.watchedCount ?? 0} />
        <Stat label="دنبال‌شونده" value={data?.followingCount ?? 0} />
        <Stat label="دنبال‌کننده" value={data?.followersCount ?? 0} />
      </View>
    </ScrollView>
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
  loader: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: 6 },
  header: { alignItems: 'center', gap: 6 },
  avatar: { width: 88, height: 88, borderRadius: 999, backgroundColor: colors.card },
  name: { fontSize: 22, marginTop: 8 },
  username: { color: colors.muted },
  bio: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radii.md, paddingVertical: 12,
  },
  followBtnActive: { backgroundColor: colors.accent },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, color: colors.accent },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
