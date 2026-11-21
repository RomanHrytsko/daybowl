import { describe, expect, it } from 'vitest';
import { heightForFraction } from './geometry';

describe('heightForFraction', () => {
  it('межі', () => {
    expect(heightForFraction(0)).toBe(0);
    expect(heightForFraction(1)).toBe(1);
    expect(heightForFraction(2)).toBe(1);
  });

  it('монотонна і враховує ширший верх', () => {
    let prev = 0;
    for (let f = 0.05; f < 1; f += 0.05) {
      const h = heightForFraction(f);
      expect(h).toBeGreaterThan(prev);
      prev = h;
    }
    // половина об'єму займає більше половини висоти, бо дно вузьке
    expect(heightForFraction(0.5)).toBeGreaterThan(0.5);
  });
});
