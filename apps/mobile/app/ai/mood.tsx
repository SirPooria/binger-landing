import { useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Send, Cpu, HelpCircle, X, Zap, Star } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { RtlTextInput } from '@/components/ui/RtlTextInput';
import { Screen } from '@/components/ui/Screen';
import { postMoodChat } from '@/lib/ai';
import { getImageUrl } from '@/lib/tmdbClient';
import { toFarsiDigits } from '@binger/shared';
import { colors, radii } from '@/constants/theme';
import type { MoodChatResponse, TmdbShow } from '@binger/shared';

type ChatMsg = {
  role: 'user' | 'bot';
  text: string;
  suggestions?: TmdbShow[];
};

const QUICK_CHIPS = [
  { label: '😂 میخوام بترکم', text: 'یه سریال کمدی و خنده دار میخوام' },
  { label: '😭 دلم گرفته', text: 'خیلی ناراحتم و دلم گرفته' },
  { label: '🤯 مغزم رو بپکون', text: 'یه سریال معمایی و پیچیده میخوام' },
  { label: '👺 انیمه خوب', text: 'چند تا انیمه خفن معرفی کن' },
  { label: '🩸 اکشن', text: 'دلم اکشن و بزن بزن میخواد' },
  { label: '❤️ عاشقانه', text: 'یه سریال رمانتیک و احساسی' },
];

const THEME_BG: Record<string, string> = {
  default: colors.background,
  drama: '#0a1020',
  comedy: '#1a1508',
  action: '#1a0808',
  horror: '#120606',
  romance: '#1a0a12',
  anime: '#0f0a1a',
};

export default function MoodChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('default');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text: 'سلام! من هسته هوشمندِ بینجرم ⚡️\nحس و حالتو بگو یا بگو شبیه چه سریالی دوست داری تا بهت پیشنهاد بدم.',
    },
  ]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const applyResponse = (res: MoodChatResponse) => {
    setTheme(res.theme ?? 'default');
    setMessages((prev) => [
      ...prev,
      { role: 'bot', text: res.text, suggestions: res.suggestions },
    ]);
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await postMoodChat(text);
      applyResponse(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'خطا در ارتباط با سرور';
      setError(msg.includes('rate') || msg.includes('محدودیت') ? msg : 'ارسال ناموفق بود. دوباره تلاش کن.');
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'متأسفم، الان نتونستم جواب بدم. چند ثانیه بعد دوباره بفرست.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const bg = THEME_BG[theme] ?? THEME_BG.default;

  return (
    <Screen noPadding style={{ backgroundColor: bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <AppText style={{ color: colors.muted }}>بازگشت</AppText>
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.cpuIcon}>
              <Cpu size={20} color="#000" />
            </View>
            <View>
              <AppText weight="black" style={{ fontSize: 15 }}>
                Binger AI <AppText style={styles.beta}>BETA</AppText>
              </AppText>
              <AppText style={{ fontSize: 10, color: colors.muted }}>موتور پیشنهاد هوشمند</AppText>
            </View>
          </View>
          <Pressable onPress={() => setHelpOpen(true)} hitSlop={10}>
            <HelpCircle size={22} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}
            >
              <View style={[styles.avatar, msg.role === 'bot' && styles.avatarBot]}>
                {msg.role === 'user' ? (
                  <AppText style={{ fontSize: 12 }}>تو</AppText>
                ) : (
                  <Zap size={14} color="#000" fill="#000" />
                )}
              </View>
              <View style={[styles.bubbleCol, msg.role === 'user' && styles.bubbleColUser]}>
                <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                  <AppText style={styles.bubbleText}>{msg.text}</AppText>
                </View>
                {!!msg.suggestions?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {msg.suggestions.map((show) => (
                      <Pressable
                        key={show.id}
                        onPress={() => router.push(`/tv/${show.id}`)}
                        style={styles.suggestCard}
                      >
                        <Image
                          source={{ uri: getImageUrl(show.poster_path) ?? undefined }}
                          style={styles.suggestPoster}
                          contentFit="cover"
                        />
                        {typeof show.vote_average === 'number' && (
                          <View style={styles.ratingBadge}>
                            <Star size={8} color={colors.accent} fill={colors.accent} />
                            <AppText style={styles.ratingText}>
                              {toFarsiDigits(show.vote_average.toFixed(1))}
                            </AppText>
                          </View>
                        )}
                        <AppText numberOfLines={2} style={styles.suggestTitle}>
                          {show.name}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.msgRow}>
              <View style={[styles.avatar, styles.avatarBot]}>
                <ActivityIndicator size="small" color="#000" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <AppText style={{ color: colors.muted }}>در حال فکر کردن...</AppText>
              </View>
            </View>
          )}
        </ScrollView>

        {!!error && (
          <AppText style={styles.errorText}>{error}</AppText>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {QUICK_CHIPS.map((chip) => (
            <Pressable
              key={chip.label}
              onPress={() => send(chip.text)}
              disabled={loading}
              style={styles.chip}
            >
              <AppText style={styles.chipText}>{chip.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <RtlTextInput
            value={input}
            onChangeText={setInput}
            placeholder="تایپ کن... (مثلا: یه سریال شبیه بریکینگ بد)"
            style={styles.input}
            editable={!loading}
            onSubmitEditing={() => void send()}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => void send()}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Send size={18} color="#000" />
            )}
          </Pressable>
        </View>

        {helpOpen && (
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setHelpOpen(false)} />
            <View style={styles.modal}>
              <Pressable style={styles.modalClose} onPress={() => setHelpOpen(false)}>
                <X size={20} color={colors.muted} />
              </Pressable>
              <AppText weight="black" style={{ textAlign: 'center', marginBottom: 16 }}>
                راهنمای هوش مصنوعی
              </AppText>
              <AppText style={styles.helpBody}>
                بر اساس حس و حال: مثلاً «دلم گرفته» یا «یه چیز خنده‌دار میخوام».
              </AppText>
              <AppText style={[styles.helpBody, { marginTop: 12 }]}>
                بر اساس شباهت: «یه سریال شبیه بریکینگ بد» یا «چیزی مثل فرندز».
              </AppText>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beta: { fontSize: 9, color: colors.muted, backgroundColor: colors.card, paddingHorizontal: 6, borderRadius: 4 },
  chatContent: { padding: 16, paddingBottom: 24, gap: 16 },
  msgRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBot: { backgroundColor: colors.accent },
  bubbleCol: { flex: 1, maxWidth: '88%' },
  bubbleColUser: { alignItems: 'flex-end' },
  bubble: { padding: 12, borderRadius: 16 },
  bubbleBot: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.cardAlt,
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  suggestCard: {
    width: 112,
    marginRight: 10,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestPoster: { width: 112, height: 168 },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { fontSize: 9, color: colors.accent },
  suggestTitle: { fontSize: 10, padding: 8, fontWeight: '700' },
  chipsScroll: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 8 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 11 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    padding: 12,
  },
  sendBtnDisabled: { opacity: 0.45, backgroundColor: colors.muted },
  errorText: { color: '#f87171', fontSize: 12, textAlign: 'center', paddingHorizontal: 16, marginBottom: 4 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalClose: { position: 'absolute', top: 12, left: 12 },
  helpBody: { fontSize: 13, lineHeight: 22, color: colors.text },
});
