import { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { API_BASE_URL, authGoogleUrl } from '@/lib/api';
import { sendMagicLink } from '@/lib/auth';
import { getAuthRedirectUri } from '@/lib/authRedirect';
import { tokensFromAuthSessionUrl } from '@/lib/completeAuthFromUrl';
import { useAuthStore } from '@/stores/useAuthStore';
import { colors, radii } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

function formatAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'سرور در دسترس نیست. Metro را با EXPO_DEV_HOST=آی‌پی وای‌فای اجرا کنید؛ Docker (nginx) و Safari: :8081/api/v1/health';
  }
  return msg || 'خطای ناشناخته';
}

export default function LoginScreen() {
  const router = useRouter();
  const signInWithTokens = useAuthStore((s) => s.signInWithTokens);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const finishSignIn = async (access: string, refresh: string) => {
    const user = await signInWithTokens(access, refresh);
    router.replace(user.onboarding_complete ? '/(tabs)' : '/(auth)/onboarding');
  };

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setMessage('');
    try {
      const redirectUri = getAuthRedirectUri();
      await sendMagicLink(email, redirectUri);
      setMessage(
        'لینک ورود ارسال شد. روی گوشی همان ایمیل را باز کنید — لینک باید اپ بینجر (Expo Go) را باز کند، نه localhost.'
      );
    } catch (e: unknown) {
      setMessage(`خطا: ${formatAuthError(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setMessage('در حال انتقال به صفحه ورود گوگل...');
    const redirectUri = getAuthRedirectUri();
    const url = authGoogleUrl(redirectUri);
    try {
      if (Platform.OS === 'web') {
        window.location.href = url;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
      if (result.type === 'success' && result.url) {
        const tokens = tokensFromAuthSessionUrl(result.url);
        if (tokens) {
          await finishSignIn(tokens.access, tokens.refresh);
          return;
        }
        setMessage('ورود گوگل تکمیل نشد — توکن دریافت نشد.');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setMessage('ورود گوگل لغو شد.');
      }
    } catch (e: unknown) {
      setMessage(`خطا: ${formatAuthError(e)}`);
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
          {Platform.OS !== 'web' && (
            <AppText style={styles.apiHint} selectable>
              {`API: ${API_BASE_URL}`}
            </AppText>
          )}
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
  apiHint: { color: colors.muted, marginTop: 10, fontSize: 10, textAlign: 'center' },
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
