import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Trophy } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { apiGet } from '@/lib/api';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';

interface LeaderRow {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  score: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiGet<LeaderRow[]>('/leaderboard'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophy size={20} color={colors.accent} />
          <AppText weight="black" style={styles.title}>جدول امتیازات</AppText>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={data ?? []}
          estimatedItemSize={64}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${item.user_id}`)}>
              <AppText weight="black" style={styles.rank}>
                {index < 3 ? MEDALS[index] : toFarsiDigits(index + 1)}
              </AppText>
              <Image source={item.avatar_url ? { uri: item.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
              <AppText weight="bold" style={{ flex: 1 }}>{item.username ?? 'کاربر'}</AppText>
              <AppText weight="black" style={{ color: colors.accent }}>{toFarsiDigits(item.score)}</AppText>
            </Pressable>
          )}
          ListEmptyComponent={<AppText style={styles.empty}>هنوز امتیازی ثبت نشده.</AppText>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radii.lg, padding: 12 },
  rank: { width: 32, fontSize: 18, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.cardAlt },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
