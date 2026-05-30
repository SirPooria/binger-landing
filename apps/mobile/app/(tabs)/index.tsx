import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { HeroSlider } from '@/components/HeroSlider';
import { CarouselRow } from '@/components/CarouselRow';
import { AiRecommendationsRow } from '@/components/AiRecommendationsRow';
import { StoriesBar } from '@/components/StoriesBar';
import { useTrending, useIranian, useAnime, useAsianDramas, useNewestGlobal } from '@/hooks/useShows';
import { colors } from '@/constants/theme';

export default function Dashboard() {
  const router = useRouter();
  const trending = useTrending();
  const iranian = useIranian();
  const anime = useAnime();
  const asian = useAsianDramas();
  const newest = useNewestGlobal();

  return (
    <Screen noPadding edges={['top']}>
      <View style={styles.topBar}>
        <AppText weight="black" style={styles.logo}>بینجر</AppText>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={12}>
          <Bell size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {trending.isLoading ? (
          <View style={styles.heroLoader}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <HeroSlider shows={trending.data ?? []} />
        )}

        <StoriesBar />
        <AiRecommendationsRow />

        <CarouselRow title="ترند هفته" shows={trending.data} loading={trending.isLoading} />
        <CarouselRow title="سریال‌های ایرانی" shows={iranian.data} loading={iranian.isLoading} />
        <CarouselRow title="جدیدترین‌های جهان" shows={newest.data} loading={newest.isLoading} />
        <CarouselRow title="انیمه‌ها" shows={anime.data} loading={anime.isLoading} />
        <CarouselRow title="درام‌های آسیایی" shows={asian.data} loading={asian.isLoading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: { fontSize: 24, color: colors.accent },
  heroLoader: { height: 400, alignItems: 'center', justifyContent: 'center' },
});
