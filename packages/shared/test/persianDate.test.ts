import { describe, it, expect } from 'vitest';
import { toFarsiDigits, relativeTimeFa } from '../src/persianDate';

describe('persian date helpers', () => {
  it('converts Latin digits to Persian digits', () => {
    expect(toFarsiDigits('2024')).toBe('۲۰۲۴');
    expect(toFarsiDigits(0)).toBe('۰');
    expect(toFarsiDigits('قسمت 12')).toBe('قسمت ۱۲');
  });

  it('returns "همین الان" for very recent times', () => {
    expect(relativeTimeFa(new Date())).toBe('همین الان');
    expect(relativeTimeFa(Date.now() - 5_000)).toBe('همین الان');
  });

  it('formats minutes/hours ago in Persian', () => {
    expect(relativeTimeFa(Date.now() - 2 * 60_000)).toBe('۲ دقیقه پیش');
    expect(relativeTimeFa(Date.now() - 3 * 60 * 60_000)).toBe('۳ ساعت پیش');
  });
});
