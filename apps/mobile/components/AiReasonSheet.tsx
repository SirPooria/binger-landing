import { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Sparkles } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { colors, radii } from '@/constants/theme';
import type { AiRecommendation } from '@binger/shared';

interface Props {
  recommendation: AiRecommendation | null;
  onClose: () => void;
}

export function AiReasonSheet({ recommendation, onClose }: Props) {
  const ref = useRef<BottomSheet>(null);

  useEffect(() => {
    if (recommendation) ref.current?.expand();
    else ref.current?.close();
  }, [recommendation]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['35%']}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Sparkles size={20} color={colors.accent} />
          </View>
          <AppText weight="black" style={styles.title}>چرا این پیشنهاد؟</AppText>
        </View>
        <AppText style={styles.reason}>
          {recommendation?.reason ?? 'هوش مصنوعی بینجر فکر می‌کنه این یکی به سلیقه‌ت می‌خوره.'}
        </AppText>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(204,255,0,0.1)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)',
  },
  title: { fontSize: 18 },
  reason: { fontSize: 16, lineHeight: 28, color: colors.text },
});
