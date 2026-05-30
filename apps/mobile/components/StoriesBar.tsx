import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { AppText } from './ui/AppText';
import { fetchActiveStories } from '@/lib/social';
import { colors } from '@/constants/theme';

export function StoriesBar() {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['stories'], queryFn: fetchActiveStories });
  const groups = data ?? [];

  return (
    <View style={styles.container}>
      <FlashList
        horizontal
        data={[{ user_id: '__add__' } as any, ...groups]}
        estimatedItemSize={76}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.user_id}
        ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          if (item.user_id === '__add__') {
            return (
              <Pressable style={styles.item} onPress={() => router.push('/story/create')}>
                <View style={[styles.ring, styles.addRing]}>
                  <Plus size={24} color={colors.accent} />
                </View>
                <AppText style={styles.name} numberOfLines={1}>استوری تو</AppText>
              </Pressable>
            );
          }
          return (
            <Pressable style={styles.item} onPress={() => router.push(`/story/${item.user_id}`)}>
              <View style={[styles.ring, item.hasUnseen && styles.ringActive]}>
                <Image source={item.avatar_url ? { uri: item.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
              </View>
              <AppText style={styles.name} numberOfLines={1}>{item.username ?? 'کاربر'}</AppText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  item: { alignItems: 'center', width: 68 },
  ring: {
    width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card,
  },
  ringActive: { borderColor: colors.accent },
  addRing: { borderStyle: 'dashed' },
  avatar: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.cardAlt },
  name: { fontSize: 11, marginTop: 6, color: colors.textMuted, textAlign: 'center' },
});
