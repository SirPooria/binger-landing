import { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, ImagePlus } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { createStory } from '@/lib/social';
import { uploadImageAsync } from '@/lib/upload';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

export default function CreateStory() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  const submit = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    try {
      let imageUrl: string | undefined;
      if (image) {
        imageUrl = await uploadImageAsync(image);
      }
      await createStory({
        user_id: user.id,
        content_type: 'custom',
        image_url: imageUrl,
        text_overlay: text.trim() || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['stories'] });
      router.replace(`/story/${user.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'انتشار استوری ناموفق بود.');
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={{ fontSize: 18 }}>استوری جدید</AppText>
        <Pressable onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.accent} /> : <AppText weight="black" style={{ color: colors.accent }}>انتشار</AppText>}
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Pressable onPress={pick} style={styles.imageBox}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ImagePlus size={32} color={colors.muted} />
              <AppText style={{ color: colors.muted }}>انتخاب عکس</AppText>
            </View>
          )}
        </Pressable>
        <RtlTextInput
          variant="bordered"
          value={text}
          onChangeText={setText}
          placeholder="یه متن روی استوری بذار..."
        />
        {!!error && <AppText style={{ color: '#f87171', textAlign: 'center' }}>{error}</AppText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  imageBox: { height: 360, borderRadius: radii.xl, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
