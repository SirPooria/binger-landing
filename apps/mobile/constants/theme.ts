// Design tokens — mirror the web app's dark theme exactly.
export const colors = {
  background: '#050505',
  accent: '#ccff00',
  accentDim: '#b3e600',
  card: '#1a1a1a',
  cardAlt: '#101010',
  border: 'rgba(255,255,255,0.1)',
  text: '#ededed',
  textMuted: '#9ca3af',
  muted: '#6b7280',
  white: '#ffffff',
  danger: '#ef4444',
} as const;

export const fonts = {
  // Loaded via expo-font in app/_layout.tsx
  vazir: 'Vazirmatn',
  vazirBold: 'Vazirmatn-Bold',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// Genre map used by the dashboard carousels & category browse.
export const GENRES: { id: number; name: string }[] = [
  { id: 10759, name: 'اکشن و ماجراجویی' },
  { id: 16, name: 'انیمیشن' },
  { id: 35, name: 'کمدی' },
  { id: 80, name: 'جنایی' },
  { id: 18, name: 'درام' },
  { id: 10765, name: 'علمی-تخیلی و فانتزی' },
  { id: 9648, name: 'معمایی' },
  { id: 10768, name: 'جنگی و سیاسی' },
];
