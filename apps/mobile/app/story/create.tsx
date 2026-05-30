import { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, ImagePlus } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { createStory } from '@/lib/social';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

export default function CreateStory() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    await createStory({ user_id: user.id, content_type: 'custom', image_url: image ?? undefined, text_overlay: text });
    router.back();
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
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="یه متن روی استوری بذار..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  imageBox: { height: 360, borderRadius: radii.xl, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.card, borderRadius: radii.md, padding: 14, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right' },
});
