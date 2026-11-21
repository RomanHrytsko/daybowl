import { describe, expect, it } from 'vitest';
import { materializeRecurrences, occursOn } from './recurrence';
import { act, tpl } from '../test/factories';

// 2026-11-23 — понеділок
const WEEK = '2026-11-23';
const work = tpl({
  id: 'work', title: 'Робота', defaultMinutes: 240,
  recurrence: { weekdays: [1, 2, 3, 4, 5], startDate: '2026-11-01' },
});

describe('occursOn', () => {
  it('враховує дні тижня та межі дат', () => {
    expect(occursOn(work, '2026-11-23')).toBe(true); // пн
    expect(occursOn(work, '2026-11-29')).toBe(false); // нд
    expect(occursOn({ ...work, recurrence: { ...work.recurrence!, endDate: '2026-11-24' } }, '2026-11-25')).toBe(false);
    expect(occursOn({ ...work, recurrence: { ...work.recurrence!, startDate: '2026-11-25' } }, '2026-11-24')).toBe(false);
    expect(occursOn({ ...work, archived: true }, '2026-11-23')).toBe(false);
    expect(occursOn(tpl(), '2026-11-23')).toBe(false);
  });
});

describe('materializeRecurrences', () => {
  it('створює справи пн–пт', () => {
    const out = materializeRecurrences(WEEK, [work], []);
    expect(out.map((a) => a.date)).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27',
    ]);
    expect(out.every((a) => a.source === 'recurrence' && a.minutes === 240)).toBe(true);
  });

  it('ідемпотентна', () => {
    const first = materializeRecurrences(WEEK, [work], []);
    expect(materializeRecurrences(WEEK, [work], first)).toEqual([]);
  });

  it('видалений повтор не повертається', () => {
    const existing = [act({ templateId: 'work', date: '2026-11-24', deletedAt: '2026-11-21' })];
    const out = materializeRecurrences(WEEK, [work], existing);
    expect(out.map((a) => a.date)).not.toContain('2026-11-24');
    expect(out).toHaveLength(4);
  });

  it('кладе повтор поверх наявних шарів', () => {
    const existing = [act({ date: '2026-11-23', order: 3 })];
    const out = materializeRecurrences(WEEK, [work], existing);
    expect(out.find((a) => a.date === '2026-11-23')!.order).toBe(4);
  });
});
