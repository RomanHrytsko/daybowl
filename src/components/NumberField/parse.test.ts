import { describe, expect, it } from 'vitest';
import { formatDecimal, parseDecimal, parseHours } from './parse';

describe('parseDecimal', () => {
  it('приймає кому з української клавіатури', () => {
    expect(parseHours('7,5')).toBe(7.5);
    expect(parseDecimal(' 16 ')).toBe(16);
    expect(parseDecimal('0.5')).toBe(0.5);
    expect(parseDecimal('8,')).toBe(8);
    expect(parseDecimal(',5')).toBe(0.5);
  });

  it('відкидає невалідне, а не повертає NaN', () => {
    for (const s of ['', ' ', ',', '7,5,1', 'abc', '-1', '1e3', '7.5.']) {
      expect(parseDecimal(s)).toBeNull();
    }
  });

  it('форматує з комою', () => {
    expect(formatDecimal(7.5)).toBe('7,5');
    expect(formatDecimal(16)).toBe('16');
  });
});
