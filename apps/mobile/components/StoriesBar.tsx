import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { AppText } from './ui/AppText';
import { fetchActiveStories, type StoryGroup } from '@/lib/social';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors } from '@/constants/theme';

type AddItem = { kind: 'add' };
type StoryListItem = AddItem | (StoryGroup & { kind: 'story' });

export function StoriesBar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({ queryKey: ['stories'], queryFn: fetchActiveStories });
  const groups = data ?? [];
  const ownGroup = user ? groups.find((g) => g.user_id === user.id) : undefined;
  const others = user ? groups.filter((g) => g.user_id !== user.id) : groups;

  const listItems: StoryListItem[] = [
    { kind: 'add' },
    ...(ownGroup ? [{ ...ownGroup, kind: 'story' as const }] : []),
    ...others.map((g) => ({ ...g, kind: 'story' as const })),
  ];

  return (
    <View style={styles.container}>
      <FlashList
        horizontal
        data={listItems}
        estimatedItemSize={76}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => (item.kind === 'add' ? 'add' : item.user_id)}
        ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          if (item.kind === 'add') {
            return (
              <Pressable style={styles.item} onPress={() => router.push('/story/create')}>
                <View style={[styles.ring, styles.addRing]}>
                  <Plus size={24} color={colors.accent} />
                </View>
                <AppText style={styles.name} numberOfLines={1}>استوری تو</AppText>
              </Pressable>
            );
          }
          const isOwn = item.user_id === user?.id;
          return (
            <Pressable style={styles.item} onPress={() => router.push(`/story/${item.user_id}`)}>
              <View style={[styles.ring, (item.hasUnseen || isOwn) && styles.ringActive]}>
                <Image source={item.avatar_url ? { uri: item.avatar_url } : undefined} style={styles.avatar} contentFit="cover" />
              </View>
              <AppText style={styles.name} numberOfLines={1}>
                {isOwn ? 'استوری من' : (item.username ?? 'کاربر')}
              </AppText>
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
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  ringActive: { borderColor: colors.accent },
  addRing: { borderStyle: 'dashed' },
  avatar: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.cardAlt },
  name: { fontSize: 11, marginTop: 6, color: colors.textMuted, textAlign: 'center' },
});
