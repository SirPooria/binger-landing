import { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { authGoogleUrl } from '@/lib/api';
import { sendMagicLink } from '@/lib/auth';
import { colors, radii } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

function getRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return 'binger://auth/callback';
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setMessage('');
    try {
      await sendMagicLink(email, getRedirectUri());
      setMessage('لینک ورود به ایمیل شما ارسال شد! لطفا صندوق ورودی (و پوشه اسپم) خود را چک کنید.');
    } catch (e: any) {
      setMessage(`خطا: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setMessage('در حال انتقال به صفحه ورود گوگل...');
    const redirectUri = getRedirectUri();
    const url = authGoogleUrl(redirectUri);
    try {
      if (Platform.OS === 'web') {
        window.location.href = url;
        return;
      }
      await WebBrowser.openAuthSessionAsync(url, redirectUri);
    } catch (e: any) {
      setMessage(`خطا: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/welcome');
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.center}>
      <View style={styles.box}>
        <Pressable onPress={goBack} style={styles.backLink} accessibilityRole="button">
          <AppText style={styles.backText}>بازگشت به صفحه اصلی</AppText>
        </Pressable>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <AppText weight="black" style={styles.title}>
            ورود یا ثبت‌نام
          </AppText>
          <AppText style={styles.subtitle}>با ایمیل یا حساب گوگل خود وارد شوید.</AppText>
        </View>

        <Pressable onPress={handleGoogle} disabled={loading} style={styles.googleBtn}>
          {loading ? <ActivityIndicator color="#000" /> : <AppText weight="black" style={{ color: '#000' }}>ورود با گوگل</AppText>}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.hr} />
          <AppText style={{ color: colors.muted, fontSize: 12 }}>یا</AppText>
          <View style={styles.hr} />
        </View>

        <AppText style={styles.label}>ایمیل</AppText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="example@mail.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Pressable onPress={handleMagicLink} disabled={loading} style={{ marginTop: 16 }}>
          <LinearGradient colors={[colors.accent, colors.accentDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Mail size={18} color="#000" />
                <AppText weight="black" style={{ color: '#000' }}>ارسال لینک ورود</AppText>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {!!message && (
          <View style={styles.message}>
            <AppText style={{ color: colors.accent, textAlign: 'center' }}>{message}</AppText>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  backLink: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: colors.muted, fontSize: 13 },
  box: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 28,
  },
  title: { fontSize: 28 },
  subtitle: { color: colors.muted, marginTop: 8, fontSize: 13 },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  hr: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6, marginRight: 4 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    color: colors.white,
    textAlign: 'left',
    fontFamily: 'Vazirmatn',
  },
  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 24,
    backgroundColor: 'rgba(132,204,22,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(132,204,22,0.3)',
    borderRadius: radii.md,
    padding: 12,
  },
});
