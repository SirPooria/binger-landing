import { useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions, Modal } from 'react-native';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Lock, Globe } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { ShowCard } from '@/components/ShowCard';
import { fetchWatchlistIds, fetchUserLists, createUserList } from '@/lib/lists';
import { getShowDetails } from '@/lib/tmdbClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

type Tab = 'watchlist' | 'custom';

export default function ListsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 5 : 3;
  const [tab, setTab] = useState<Tab>('watchlist');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const watchlist = useQuery({ queryKey: ['watchlist-ids', userId], queryFn: () => fetchWatchlistIds(userId!), enabled: !!userId });
  const lists = useQuery({ queryKey: ['user-lists', userId], queryFn: () => fetchUserLists(userId!), enabled: !!userId });

  const watchlistShows = useQuery({
    queryKey: ['watchlist-shows', watchlist.data],
    queryFn: async () => Promise.all((watchlist.data ?? []).map((id) => getShowDetails(id).catch(() => null))),
    enabled: !!watchlist.data,
  });

  const submitNewList = async () => {
    if (!userId || !newTitle.trim()) return;
    await createUserList(userId, newTitle.trim());
    setNewTitle('');
    setCreating(false);
    qc.invalidateQueries({ queryKey: ['user-lists', userId] });
  };

  return (
    <Screen noPadding>
      <View style={styles.tabsRow}>
        {(['watchlist', 'custom'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <AppText weight={tab === t ? 'black' : 'regular'} style={{ color: tab === t ? colors.accent : colors.muted }}>
              {t === 'watchlist' ? 'لیست تماشا' : 'لیست‌های من'}
            </AppText>
          </Pressable>
        ))}
      </View>

      {tab === 'watchlist' ? (
        watchlistShows.isLoading || watchlist.isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlashList
            data={(watchlistShows.data ?? []).filter(Boolean)}
            numColumns={numColumns}
            estimatedItemSize={180}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1, padding: 6, alignItems: 'center' }}>
                <ShowCard show={item} width={(width - 24) / numColumns - 12} />
              </View>
            )}
            ListEmptyComponent={<AppText style={styles.empty}>لیست تماشای تو خالیه.</AppText>}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Pressable style={styles.createBtn} onPress={() => setCreating(true)}>
            <Plus size={20} color={colors.accent} />
            <AppText weight="bold" style={{ color: colors.accent }}>ساختن لیست جدید</AppText>
          </Pressable>
          {(lists.data ?? []).map((l) => (
            <View key={l.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={{ fontSize: 16 }}>{l.title}</AppText>
                {!!l.description && <AppText style={styles.listDesc}>{l.description}</AppText>}
                <AppText style={styles.listMeta}>{`${l.item_count ?? 0} سریال`}</AppText>
              </View>
              {l.is_public ? <Globe size={16} color={colors.muted} /> : <Lock size={16} color={colors.muted} />}
            </View>
          ))}
          {(lists.data ?? []).length === 0 && <AppText style={styles.empty}>هنوز لیستی نساختی.</AppText>}
        </ScrollView>
      )}

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <AppText weight="black" style={{ fontSize: 18, marginBottom: 12 }}>لیست جدید</AppText>
            <RtlTextInput
              variant="bordered"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="مثلاً: بهترین‌های کره‌ای"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable onPress={() => setCreating(false)} style={[styles.modalBtn, { backgroundColor: colors.card }]}>
                <AppText>لغو</AppText>
              </Pressable>
              <Pressable onPress={submitNewList} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
                <AppText weight="black" style={{ color: '#000' }}>بساز</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.full, backgroundColor: colors.card },
  tabActive: { borderWidth: 1, borderColor: colors.accent },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radii.lg, padding: 16,
  },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radii.lg, padding: 16, gap: 12 },
  listDesc: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  listMeta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 360, backgroundColor: colors.cardAlt, borderRadius: radii.xl, padding: 24, borderWidth: 1, borderColor: colors.border },
  modalInput: { backgroundColor: colors.card, borderRadius: radii.md, padding: 14, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: radii.md, alignItems: 'center' },
});
