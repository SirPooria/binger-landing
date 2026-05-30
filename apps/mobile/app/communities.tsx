import { useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Users, Radio, CheckCircle2, BadgeCheck } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import {
  fetchGroups, joinGroup, fetchMyGroupIds,
  fetchChannels, subscribeChannel, fetchMyChannelIds,
} from '@/lib/communities';
import { useAuthStore } from '@/stores/useAuthStore';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

type Tab = 'groups' | 'channels';

export default function Communities() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('groups');

  const groups = useQuery({ queryKey: ['groups'], queryFn: fetchGroups });
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchChannels });
  const myGroups = useQuery({ queryKey: ['my-groups', userId], queryFn: () => fetchMyGroupIds(userId!), enabled: !!userId });
  const myChannels = useQuery({ queryKey: ['my-channels', userId], queryFn: () => fetchMyChannelIds(userId!), enabled: !!userId });

  const join = async (groupId: string) => {
    if (!userId) return;
    await joinGroup(groupId, userId);
    qc.invalidateQueries({ queryKey: ['my-groups', userId] });
  };
  const subscribe = async (channelId: string) => {
    if (!userId) return;
    await subscribeChannel(channelId, userId);
    qc.invalidateQueries({ queryKey: ['my-channels', userId] });
  };

  const loading = tab === 'groups' ? groups.isLoading : channels.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={{ fontSize: 18 }}>انجمن‌ها</AppText>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('groups')} style={[styles.tab, tab === 'groups' && styles.tabActive]}>
          <Users size={16} color={tab === 'groups' ? colors.accent : colors.muted} />
          <AppText style={{ color: tab === 'groups' ? colors.accent : colors.muted }}>گروه‌ها</AppText>
        </Pressable>
        <Pressable onPress={() => setTab('channels')} style={[styles.tab, tab === 'channels' && styles.tabActive]}>
          <Radio size={16} color={tab === 'channels' ? colors.accent : colors.muted} />
          <AppText style={{ color: tab === 'channels' ? colors.accent : colors.muted }}>کانال‌ها</AppText>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {tab === 'groups'
            ? (groups.data ?? []).map((g: any) => {
                const joined = (myGroups.data ?? []).includes(g.id);
                return (
                  <View key={g.id} style={styles.card}>
                    <Image source={g.avatar_url ? { uri: g.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <AppText weight="bold">{g.name}</AppText>
                      <AppText style={styles.meta}>{`${toFarsiDigits(g.members_count)} عضو`}</AppText>
                    </View>
                    <Pressable onPress={() => join(g.id)} disabled={joined} style={[styles.joinBtn, joined && styles.joinedBtn]}>
                      {joined ? <CheckCircle2 size={16} color={colors.muted} /> : <AppText weight="bold" style={{ color: '#000' }}>عضویت</AppText>}
                    </Pressable>
                  </View>
                );
              })
            : (channels.data ?? []).map((c: any) => {
                const subbed = (myChannels.data ?? []).includes(c.id);
                return (
                  <View key={c.id} style={styles.card}>
                    <Image source={c.avatar_url ? { uri: c.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText weight="bold">{c.name}</AppText>
                        {c.is_verified && <BadgeCheck size={14} color={colors.accent} />}
                      </View>
                      <AppText style={styles.meta}>{`${toFarsiDigits(c.subscribers_count)} مشترک`}</AppText>
                    </View>
                    <Pressable onPress={() => subscribe(c.id)} disabled={subbed} style={[styles.joinBtn, subbed && styles.joinedBtn]}>
                      {subbed ? <CheckCircle2 size={16} color={colors.muted} /> : <AppText weight="bold" style={{ color: '#000' }}>دنبال کردن</AppText>}
                    </Pressable>
                  </View>
                );
              })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  tabs: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.full, backgroundColor: colors.card },
  tabActive: { borderWidth: 1, borderColor: colors.accent },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radii.lg, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.cardAlt },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  joinBtn: { backgroundColor: colors.accent, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  joinedBtn: { backgroundColor: colors.cardAlt },
});
