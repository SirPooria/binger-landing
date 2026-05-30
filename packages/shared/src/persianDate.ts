// Persian/Farsi date & number helpers. All UI dates must use these.

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits in a string to Persian digits. */
export function toFarsiDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Relative time in Persian, e.g. "۲ ساعت پیش". */
export function relativeTimeFa(date: string | number | Date): string {
  const then = new Date(date).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  const units: [number, string][] = [
    [60, 'ثانیه'],
    [60, 'دقیقه'],
    [24, 'ساعت'],
    [30, 'روز'],
    [12, 'ماه'],
    [Number.POSITIVE_INFINITY, 'سال'],
  ];

  if (diffSec < 60) return 'همین الان';

  let value = diffSec;
  let unitLabel = 'ثانیه';
  let acc = 1;
  for (const [factor, label] of units) {
    if (value < factor) {
      unitLabel = label;
      break;
    }
    value = Math.floor(value / factor);
    acc *= factor;
    unitLabel = label;
  }
  return `${toFarsiDigits(value)} ${unitLabel} پیش`;
}

/** Full Persian (Jalali via Intl) date string, e.g. "۱۴ خرداد ۱۴۰۳". */
export function formatDateFa(date: string | number | Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  } catch {
    return toFarsiDigits(new Date(date).toLocaleDateString());
  }
}
