import { describe, expect, it } from 'vitest';
import { copyWeek } from './copyWeek';
import { act } from '../test/factories';

describe('copyWeek', () => {
  const from = '2026-11-16';
  const to = '2026-11-23';

  it('копіює ручні та скопійовані справи з тим самим днем тижня', () => {
    const src = [
      act({ date: '2026-11-17', title: 'Басейн', source: 'manual', status: 'done' }),
      act({ date: '2026-11-22', title: 'Кіно', source: 'copy' }),
    ];
    const out = copyWeek(from, to, src, []);
    expect(out.map((a) => [a.date, a.title])).toEqual([
      ['2026-11-24', 'Басейн'],
      ['2026-11-29', 'Кіно'],
    ]);
    expect(out.every((a) => a.source === 'copy' && a.status === 'planned')).toBe(true);
    expect(out[0].id).not.toBe(src[0].id);
  });

  it('пропускає повтори і видалені', () => {
    const src = [
      act({ date: '2026-11-17', source: 'recurrence', templateId: 't' }),
      act({ date: '2026-11-17', deletedAt: '2026-11-18' }),
    ];
    expect(copyWeek(from, to, src, [])).toEqual([]);
  });

  it('додає шари поверх наявних', () => {
    const src = [act({ date: '2026-11-17', order: 0 })];
    const dst = [act({ date: '2026-11-24', order: 2 })];
    expect(copyWeek(from, to, src, dst)[0].order).toBe(3);
  });
});
