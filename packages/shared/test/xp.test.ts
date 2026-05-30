import { describe, it, expect } from 'vitest';
import { levelForXp, levelProgress, xpToNextLevel, LEVELS } from '../src/xp';

describe('xp / leveling', () => {
  it('maps xp to the correct level tier', () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(499).level).toBe(1);
    expect(levelForXp(500).level).toBe(2);
    expect(levelForXp(1500).level).toBe(3);
    expect(levelForXp(3500).level).toBe(4);
    expect(levelForXp(7000).level).toBe(5);
    expect(levelForXp(15000).level).toBe(6);
    expect(levelForXp(999_999).level).toBe(6);
  });

  it('returns the top tier for very large xp', () => {
    const top = LEVELS[LEVELS.length - 1];
    expect(levelForXp(1_000_000)).toEqual(top);
  });

  it('computes progress within a level between 0 and 1', () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(250)).toBeCloseTo(0.5, 5); // halfway through level 1 (0..500)
    expect(levelProgress(15_001)).toBe(1); // top tier is always full
  });

  it('computes xp remaining to the next level', () => {
    expect(xpToNextLevel(0)).toBe(500);
    expect(xpToNextLevel(400)).toBe(100);
    expect(xpToNextLevel(20_000)).toBe(0); // already maxed
  });
});
