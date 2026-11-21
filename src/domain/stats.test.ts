import { describe, expect, it } from 'vitest';
import { dayStats, weekStats } from './stats';
import { act, cat } from '../test/factories';
import { formatHours } from './format';

const self = cat({ id: 'self', kind: 'self' });
const work = cat({ id: 'work', kind: 'obligation' });
const cats = new Map([self, work].map((c) => [c.id, c]));

describe('dayStats', () => {
  it('рахує вільний час і час для себе', () => {
    const s = dayStats(
      [act({ categoryId: 'work', minutes: 480 }), act({ categoryId: 'self', minutes: 90 })],
      960, cats,
    );
    expect(s.total).toBe(570);
    expect(s.freeMinutes).toBe(390);
    expect(s.overflowMinutes).toBe(0);
    expect(s.selfMinutes).toBe(90);
    expect(s.byCategory).toEqual({ work: 480, self: 90 });
  });

  it('показує переповнення', () => {
    const s = dayStats([act({ categoryId: 'work', minutes: 1050 })], 960, cats);
    expect(s.fill).toBeGreaterThan(1);
    expect(s.overflowMinutes).toBe(90);
    expect(s.freeMinutes).toBe(0);
  });

  it('ігнорує видалені та пропущені', () => {
    const s = dayStats(
      [
        act({ minutes: 60, deletedAt: '2026-11-01' }),
        act({ minutes: 60, status: 'skipped' }),
        act({ minutes: 30, status: 'done' }),
      ],
      960, cats,
    );
    expect(s.total).toBe(30);
  });

  it('не ділить на нуль при нульовому об\'ємі', () => {
    expect(dayStats([], 0, cats).fill).toBe(0);
  });
});

describe('weekStats', () => {
  it('сумує дні й рахує переповнені', () => {
    const a = dayStats([act({ categoryId: 'self', minutes: 60 })], 960, cats);
    const b = dayStats([act({ categoryId: 'work', minutes: 1000 })], 960, cats);
    const w = weekStats([a, b]);
    expect(w.selfMinutes).toBe(60);
    expect(w.total).toBe(1060);
    expect(w.overflowDays).toBe(1);
    expect(w.byCategory).toEqual({ self: 60, work: 1000 });
  });
});

describe('formatHours', () => {
  it('форматує українською', () => {
    expect(formatHours(90)).toBe('1,5 год');
    expect(formatHours(30)).toBe('30 хв');
    expect(formatHours(0)).toBe('0 год');
    expect(formatHours(960)).toBe('16 год');
  });
});
