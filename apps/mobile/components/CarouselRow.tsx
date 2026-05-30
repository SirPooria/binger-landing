import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { AppText } from './ui/AppText';
import { ShowCard } from './ShowCard';
import { colors } from '@/constants/theme';
import type { TmdbShow } from '@binger/shared';

interface CarouselRowProps {
  title: string;
  shows: TmdbShow[] | undefined;
  loading?: boolean;
  onCardLongPress?: (show: TmdbShow) => void;
}

export function CarouselRow({ title, shows, loading, onCardLongPress }: CarouselRowProps) {
  return (
    <View style={styles.container}>
      <AppText weight="black" style={styles.title}>
        {title}
      </AppText>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlashList
          horizontal
          // RTL: content flows right-to-left automatically via I18nManager.
          data={shows ?? []}
          estimatedItemSize={130}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <ShowCard show={item} onLongPress={onCardLongPress ? () => onCardLongPress(item) : undefined} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: { fontSize: 18, marginBottom: 12, paddingHorizontal: 16 },
  loader: { height: 195, alignItems: 'center', justifyContent: 'center' },
});
