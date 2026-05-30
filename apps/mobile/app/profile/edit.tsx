import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, ImagePlus } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { updateProfile, uploadAvatar, refreshAuthUser, fetchProfileStats } from '@/lib/profile';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: () => fetchProfileStats(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (stats?.profile?.bio) setBio(stats.profile.bio);
  }, [stats?.profile?.bio]);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setLocalAvatar(res.assets[0].uri);
      setAvatarUri(res.assets[0].uri);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      let avatarUrl = user.avatar_url ?? undefined;
      if (localAvatar) {
        avatarUrl = await uploadAvatar(localAvatar);
      }
      await updateProfile({
        full_name: fullName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl,
      });
      const refreshed = await refreshAuthUser();
      setUser(refreshed);
      qc.invalidateQueries({ queryKey: ['profile-stats', user.id] });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronRight size={26} color={colors.white} />
        </Pressable>
        <AppText weight="black" style={{ fontSize: 18 }}>ویرایش پروفایل</AppText>
        <Pressable onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.accent} /> : <AppText weight="black" style={{ color: colors.accent }}>ذخیره</AppText>}
        </Pressable>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ImagePlus size={28} color={colors.muted} />
            </View>
          )}
          <AppText style={styles.avatarHint}>تغییر عکس</AppText>
        </Pressable>

        <View>
          <AppText style={styles.label}>نام</AppText>
          <RtlTextInput variant="bordered" value={fullName} onChangeText={setFullName} placeholder="نام کامل" />
        </View>

        <View>
          <AppText style={styles.label}>نام کاربری</AppText>
          <RtlTextInput
            variant="bordered"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            textAlign="left"
          />
        </View>

        <View>
          <AppText style={styles.label}>بیو</AppText>
          <RtlTextInput
            variant="bordered"
            value={bio}
            onChangeText={setBio}
            placeholder="درباره خودت بنویس..."
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <AppText style={{ color: colors.accent, textAlign: 'center' }}>{error}</AppText>
          </View>
        )}

        {Platform.OS === 'web' && (
          <AppText style={styles.hint}>Enter برای رفتن به فیلد بعدی</AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  avatarWrap: { alignItems: 'center', gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 999, backgroundColor: colors.card },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarHint: { color: colors.accent, fontSize: 13 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6, marginRight: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: radii.md,
    padding: 12,
  },
  hint: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
