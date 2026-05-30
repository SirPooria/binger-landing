import { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { ShowCard } from '@/components/ShowCard';
import { searchShows } from '@/lib/tmdbClient';
import { colors, radii } from '@/constants/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 5 : 3;

  // Debounce input by 400ms.
  const onChange = (text: string) => {
    setQuery(text);
    clearTimeout((onChange as any)._t);
    (onChange as any)._t = setTimeout(() => setDebounced(text), 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchShows(debounced),
    enabled: debounced.length > 1,
  });

  return (
    <Screen noPadding>
      <View style={styles.searchBar}>
        <SearchIcon size={20} color={colors.muted} />
        <RtlTextInput
          value={query}
          onChangeText={onChange}
          placeholder={'\u2026جستجوی سریال'}
          style={styles.input}
          autoFocus
        />
      </View>

      {isLoading && debounced.length > 1 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={data ?? []}
          numColumns={numColumns}
          estimatedItemSize={180}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 6, alignItems: 'center' }}>
              <ShowCard show={item} width={(width - 24) / numColumns - 12} />
            </View>
          )}
          ListEmptyComponent={
            debounced.length > 1 ? (
              <AppText style={styles.empty}>نتیجه‌ای پیدا نشد.</AppText>
            ) : (
              <AppText style={styles.empty}>اسم یک سریال را تایپ کن.</AppText>
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
