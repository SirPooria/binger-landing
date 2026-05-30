import { View, Pressable, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { ShowCard } from '@/components/ShowCard';
import { getShowsByGenre } from '@/lib/tmdbClient';
import { GENRES, colors } from '@/constants/theme';

export default function CategoryBrowse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 5 : 3;
  const genreId = id === 'null' ? null : Number(id);
  const genreName = GENRES.find((g) => g.id === genreId)?.name ?? 'دسته‌بندی';

  const { data, fetchNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['category', genreId],
    queryFn: ({ pageParam }) => getShowsByGenre(genreId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.length === 0 ? undefined : all.length + 1),
  });

  const shows = data?.pages.flat() ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={styles.title}>{genreName}</AppText>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={shows}
          numColumns={numColumns}
          estimatedItemSize={180}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          onEndReached={() => fetchNextPage()}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 6, alignItems: 'center' }}>
              <ShowCard show={item} width={(width - 24) / numColumns - 12} />
            </View>
          )}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20 },
});
