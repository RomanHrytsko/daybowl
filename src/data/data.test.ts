import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { seedIfEmpty } from './seed';
import {
  activitiesOfWeek, addActivity, copyWeek, deleteActivity, ensureRecurrences, moveActivity, shiftActivity,
} from './repos/activities';
import { createTemplate } from './repos/templates';
import { exportData, importData, parseBackup } from './backup';

const WEEK = '2026-11-23';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await seedIfEmpty();
});

describe('seed', () => {
  it('створює 6 категорій і не дублює їх', async () => {
    await seedIfEmpty();
    expect(await db.categories.count()).toBe(6);
    expect(await db.templates.count()).toBeGreaterThan(0);
  });
});

describe('повтори в базі', () => {
  it('видалений повтор не повертається після повторного відкриття тижня', async () => {
    const cat = (await db.categories.toArray())[1];
    await createTemplate({
      title: 'Робота', categoryId: cat.id, defaultMinutes: 240,
      recurrence: { weekdays: [1, 2, 3, 4, 5], startDate: WEEK },
    });
    await ensureRecurrences(WEEK);
    await ensureRecurrences(WEEK);
    let acts = await activitiesOfWeek(WEEK);
    expect(acts).toHaveLength(5);

    await deleteActivity(acts.find((a) => a.date === WEEK)!);
    await ensureRecurrences(WEEK);
    acts = (await activitiesOfWeek(WEEK)).filter((a) => !a.deletedAt);
    expect(acts).toHaveLength(4);
    expect(acts.map((a) => a.date)).not.toContain(WEEK);
  });

  it('перенесений повтор не дублюється на старому дні', async () => {
    const cat = (await db.categories.toArray())[1];
    await createTemplate({
      title: 'Робота', categoryId: cat.id, defaultMinutes: 240,
      recurrence: { weekdays: [1], startDate: WEEK },
    });
    await ensureRecurrences(WEEK);
    const [a] = await activitiesOfWeek(WEEK);
    await moveActivity(a, '2026-11-25');
    await ensureRecurrences(WEEK);
    const live = (await activitiesOfWeek(WEEK)).filter((x) => !x.deletedAt);
    expect(live.map((x) => x.date)).toEqual(['2026-11-25']);
  });
});

describe('порядок шарів', () => {
  it('зсуває шар угору', async () => {
    const a = await addActivity({ date: WEEK, title: 'A', categoryId: 'c', minutes: 30 });
    await addActivity({ date: WEEK, title: 'B', categoryId: 'c', minutes: 30 });
    await shiftActivity(a, 1);
    const acts = (await activitiesOfWeek(WEEK)).sort((x, y) => x.order - y.order);
    expect(acts.map((x) => x.title)).toEqual(['B', 'A']);
  });
});

describe('копія тижня', () => {
  it('копіює ручні справи на наступний тиждень', async () => {
    await addActivity({ date: '2026-11-17', title: 'Басейн', categoryId: 'c', minutes: 60 });
    expect(await copyWeek('2026-11-16', WEEK)).toBe(1);
    const [a] = await activitiesOfWeek(WEEK);
    expect(a.date).toBe('2026-11-24');
    expect(a.source).toBe('copy');
  });
});

describe('резервна копія', () => {
  it('експорт + імпорт відновлюють той самий стан', async () => {
    await addActivity({ date: WEEK, title: 'A', categoryId: 'c', minutes: 30 });
    const before = await exportData();
    const json = JSON.stringify(before);

    await Promise.all(db.tables.map((t) => t.clear()));
    await importData(parseBackup(json));
    const after = await exportData();
    expect({ ...after, exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
  });

  it('відхиляє чужий файл', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow();
  });
});
