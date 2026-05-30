import { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { FORUM_CATEGORIES, createThread } from '@/lib/forums';
import { awardXp } from '@/lib/gamification';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

export default function CreateThread() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [category, setCategory] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || !title.trim() || !body.trim()) return;
    setSaving(true);
    await createThread({ userId: user.id, showId: Number(showId), category, title: title.trim(), body: body.trim(), isSpoiler });
    await awardXp(user.id, 'forum_post');
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={{ fontSize: 18 }}>بحث جدید</AppText>
        <Pressable onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.accent} /> : <AppText weight="black" style={{ color: colors.accent }}>ثبت</AppText>}
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <View style={styles.catRow}>
          {FORUM_CATEGORIES.map((c) => (
            <Pressable key={c.key} onPress={() => setCategory(c.key)} style={[styles.chip, category === c.key && styles.chipActive]}>
              <AppText style={{ color: category === c.key ? colors.accent : colors.muted, fontSize: 13 }}>{c.label}</AppText>
            </Pressable>
          ))}
        </View>
        <RtlTextInput variant="bordered" value={title} onChangeText={setTitle} placeholder="عنوان بحث" />
        <RtlTextInput
          variant="bordered"
          value={body}
          onChangeText={setBody}
          placeholder="متن بحث..."
          style={{ height: 160, textAlignVertical: 'top' }}
          multiline
        />
        <View style={styles.spoilerRow}>
          <AppText>این بحث اسپویل دارد</AppText>
          <Switch value={isSpoiler} onValueChange={setIsSpoiler} trackColor={{ true: colors.accent }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.card, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { borderWidth: 1, borderColor: colors.accent },
  input: { backgroundColor: colors.card, borderRadius: radii.md, padding: 14, color: colors.white, fontFamily: 'Vazirmatn', textAlign: 'right' },
  spoilerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
