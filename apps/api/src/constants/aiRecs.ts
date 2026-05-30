export const AI_RECS_MIN_WATCHED_SHOWS = 3;

export const AI_RECS_HOW_TO_WATCH_FA =
  'یک «سریال تماشا‌شده» یعنی حداقل یک قسمت را در صفحهٔ همان قسمت با دکمه «علامت‌گذاری به عنوان دیده‌شده» ثبت کنی. افزودن به لیست تماشا یا امتیاز ستاره‌ای به تنهایی کافی نیست.';

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
  howToWatch: string;
  generationStatus: AiRecsGenerationStatus;
  /** True when the user can run today's on-demand generation. */
  quotaAvailable: boolean;
}
