import type { TmdbShow } from './types';

/** Distinct shows marked watched before personalized AI recs are meaningful. */
export const AI_RECS_MIN_WATCHED_SHOWS = 3;

export type MoodMatchKind = 'similar' | 'genre' | 'fallback';

export interface MoodChatResponse {
  text: string;
  suggestions: TmdbShow[];
  theme: string;
  match: MoodMatchKind;
  genreId: number | null;
}

export type AiRecsGenerationStatus =
  | 'none'
  | 'pending'
  | 'ready'
  | 'processing'
  | 'quota_exhausted';

export interface AiRecsStatus {
  watchedShows: number;
  minRequired: number;
  ready: boolean;
  /** What counts toward AI personalization (Persian, for UI). */
  howToWatch: string;
  generationStatus: AiRecsGenerationStatus;
  quotaAvailable: boolean;
}

/** Persian keyword → TMDB genre id (mood engine). */
export const MOOD_GENRE_MAP: Record<string, number> = {
  انیمه: 16,
  انیمیشن: 16,
  کارتون: 16,
  خنده: 35,
  شاد: 35,
  بخندم: 35,
  طنز: 35,
  کمدی: 35,
  غم: 18,
  ناراحت: 18,
  'دلم گرفت': 18,
  گریه: 18,
  درام: 18,
  انرژی: 28,
  اکشن: 28,
  'بزن بزن': 28,
  هیجان: 28,
  استرس: 9648,
  ترس: 27,
  جنایی: 80,
  معما: 9648,
  راز: 9648,
  ترسناک: 27,
  عشق: 10749,
  رومانتیک: 10749,
  عاشقانه: 10749,
  علمی: 10765,
  تخیلی: 10765,
  مستند: 99,
};

export const MOOD_SIMILARITY_TRIGGERS = ['شبیه', 'مثل', 'سبک', 'تو مایه های', 'عین', 'مانند'] as const;

export const MOOD_STOP_WORDS = [
  'سریال',
  'فیلم',
  'یه',
  'معرفی',
  'کن',
  'میخوام',
  'به',
  'رو',
  'چی',
  'داری',
  'بهم',
  'بگو',
] as const;

export const MOOD_BOT_VARIANTS = {
  fallback: [
    'دقیق نگرفتم چی میخوای، ولی اینا الان خیلی ترندن:',
    'سیگنال ضعیفه! ولی فکر کنم از اینا خوشت بیاد:',
    'یه کم گیج شدم، ولی این لیست برگزیده رو ببین:',
  ],
  success: [
    'فهمیدم! اینا دقیقاً خوراک خودته:',
    'اوه، سلیقه‌ت عالیه. اینا رو ببین:',
    'پردازش شد 🧠. بهترین گزینه‌ها برای مودِ الانِت:',
    'پیداشون کردم! فکر کنم عاشق اینا بشی:',
  ],
} as const;

export const MOOD_THEMES: Record<string, string> = {
  default: 'default',
  '18': 'drama',
  '35': 'comedy',
  '28': 'action',
  '27': 'horror',
  '10749': 'romance',
  '16': 'anime',
};

export const AI_RECS_HOW_TO_WATCH_FA =
  'یک «سریال تماشا‌شده» یعنی حداقل یک قسمت را در صفحهٔ همان قسمت با دکمه «علامت‌گذاری به عنوان دیده‌شده» ثبت کنی. افزودن به لیست تماشا یا امتیاز ستاره‌ای به تنهایی کافی نیست.';
