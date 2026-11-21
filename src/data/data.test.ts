import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { DaybowlDB, SCHEMA_V1, db } from './db';
import { seedIfEmpty } from './seed';
import {
  activitiesOfWeek, addActivity, copyWeek, deleteActivity, ensureRecurrences, moveActivity, shiftActivity,
} from './repos/activities';
import { createTemplate, deleteTemplate } from './repos/templates';
import {
  CategoryInUseError, categoryUsage, createCategory, deleteCategory, reassignAndDeleteCategory,
} from './repos/categories';
import { getSettings, updateSettings } from './repos/settings';
import { backupOverdueDays, exportData, importData, parseBackup, saveBackup } from './backup';
import { act, cat, tpl } from '../test/factories';

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

describe('нагадування про копію', () => {
  const now = new Date('2026-11-30T12:00:00Z');

  it('мовчить без справ або якщо копія свіжа', () => {
    expect(backupOverdueDays({ lastBackupAt: '2026-11-01T00:00:00Z' }, false, now)).toBeNull();
    expect(backupOverdueDays({ lastBackupAt: '2026-11-25T00:00:00Z' }, true, now)).toBeNull();
  });

  it('нагадує через 7 днів; без копії рахує від онбордингу', () => {
    expect(backupOverdueDays({ lastBackupAt: '2026-11-20T00:00:00Z' }, true, now)).toBe(10);
    expect(backupOverdueDays({ onboardedAt: '2026-11-23T00:00:00Z' }, true, now)).toBe(7);
    expect(backupOverdueDays({ onboardedAt: '2026-11-28T00:00:00Z' }, true, now)).toBeNull();
  });

  it('saveBackup запам\'ятовує дату копії', async () => {
    URL.createObjectURL ??= () => 'blob:x';
    URL.revokeObjectURL ??= () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await saveBackup();
    expect((await getSettings()).lastBackupAt).toBeTruthy();
  });

  describe('Web Share (iOS)', () => {
    const nav = navigator as unknown as Record<string, unknown>;
    afterEach(() => {
      delete nav.canShare;
      delete nav.share;
      vi.restoreAllMocks();
    });

    it('передає підготовлений файл у меню «Поділитися» без завантаження', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      nav.canShare = () => true;
      nav.share = share;
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const snapshot = await exportData();

      expect(await saveBackup(snapshot)).toBe('shared');
      const file = share.mock.calls[0][0].files[0] as File;
      expect(file.name).toMatch(/^daybowl-\d{4}-\d{2}-\d{2}\.json$/);
      expect(file.type).toBe('application/json');
      expect(parseBackup(await file.text()).format).toBe('daybowl-backup');
      expect(click).not.toHaveBeenCalled();
      expect((await getSettings()).lastBackupAt).toBeTruthy();
    });

    it('скасування меню не вважається копією', async () => {
      await updateSettings({ lastBackupAt: undefined });
      nav.canShare = () => true;
      nav.share = () => Promise.reject(new DOMException('cancel', 'AbortError'));
      expect(await saveBackup()).toBe('cancelled');
      expect((await getSettings()).lastBackupAt).toBeUndefined();
    });

    it('без дозволу на share падає назад на завантаження', async () => {
      URL.createObjectURL ??= () => 'blob:x';
      URL.revokeObjectURL ??= () => {};
      nav.canShare = () => true;
      nav.share = () => Promise.reject(new DOMException('no gesture', 'NotAllowedError'));
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      expect(await saveBackup()).toBe('downloaded');
      expect(click).toHaveBeenCalledOnce();
    });
  });
});

describe('видалення шаблонів і категорій', () => {
  it('видалений шаблон лишає вже створені справи і більше не генерує повторів', async () => {
    const c = (await db.categories.toArray())[1];
    const t = await createTemplate({
      title: 'Робота', categoryId: c.id, defaultMinutes: 240,
      recurrence: { weekdays: [1, 2], startDate: WEEK },
    });
    await ensureRecurrences(WEEK);
    expect(await activitiesOfWeek(WEEK)).toHaveLength(2);

    await deleteTemplate(t.id);
    expect(await db.templates.get(t.id)).toBeUndefined();
    const acts = await activitiesOfWeek(WEEK);
    expect(acts.map((a) => [a.title, a.categoryId, a.minutes])).toEqual([
      ['Робота', c.id, 240], ['Робота', c.id, 240],
    ]);

    await ensureRecurrences('2026-11-30');
    expect(await activitiesOfWeek('2026-11-30')).toHaveLength(0);
  });

  it('невикористана категорія видаляється фізично', async () => {
    const c = await createCategory({ name: 'Нова', color: '#000', kind: 'neutral' });
    await deleteCategory(c.id);
    expect(await db.categories.get(c.id)).toBeUndefined();
  });

  it('використану категорію не можна просто видалити', async () => {
    const c = await createCategory({ name: 'Нова', color: '#000', kind: 'neutral' });
    await addActivity({ date: WEEK, title: 'A', categoryId: c.id, minutes: 30 });
    await expect(deleteCategory(c.id)).rejects.toBeInstanceOf(CategoryInUseError);
    expect(await db.categories.get(c.id)).toBeDefined();
  });

  it('перенесення переводить справи й шаблони в іншу категорію і видаляє стару', async () => {
    const from = await createCategory({ name: 'Стара', color: '#000', kind: 'neutral' });
    const to = (await db.categories.orderBy('order').first())!;
    await addActivity({ date: WEEK, title: 'A', categoryId: from.id, minutes: 30 });
    await createTemplate({ title: 'T', categoryId: from.id, defaultMinutes: 30 });
    expect(await categoryUsage(from.id)).toEqual({ activities: 1, templates: 1 });

    await reassignAndDeleteCategory(from.id, to.id);
    expect(await db.categories.get(from.id)).toBeUndefined();
    expect(await categoryUsage(from.id)).toEqual({ activities: 0, templates: 0 });
    const [a] = await activitiesOfWeek(WEEK);
    expect(a.categoryId).toBe(to.id);
  });

  it('перенесення у неіснуючу категорію нічого не змінює', async () => {
    const from = await createCategory({ name: 'Стара', color: '#000', kind: 'neutral' });
    await addActivity({ date: WEEK, title: 'A', categoryId: from.id, minutes: 30 });
    await expect(reassignAndDeleteCategory(from.id, 'nope')).rejects.toThrow();
    expect(await db.categories.get(from.id)).toBeDefined();
    expect((await activitiesOfWeek(WEEK))[0].categoryId).toBe(from.id);
  });
});

describe('міграції схеми', () => {
  it('схема version(1) заморожена', () => {
    // Якщо цей тест падає — ви змінили v1. Поверніть її і додайте version(2) (див. db.ts).
    expect(SCHEMA_V1).toEqual({
      activities: 'id, date, [date+order], templateId',
      dayConfigs: 'date',
      categories: 'id, order',
      templates: 'id, usageCount',
      settings: 'id',
    });
  });

  it('база, створена схемою v1, відкривається поточною DaybowlDB без втрат', async () => {
    const name = 'daybowl-v1-fixture';
    await Dexie.delete(name);
    const old = new Dexie(name);
    old.version(1).stores({
      activities: 'id, date, [date+order], templateId',
      dayConfigs: 'date',
      categories: 'id, order',
      templates: 'id, usageCount',
      settings: 'id',
    });
    const c = cat({ name: 'Спорт' });
    const t = tpl({ categoryId: c.id });
    const a = act({ categoryId: c.id, templateId: t.id });
    const settings = { id: 'settings', defaultCapacityMinutes: 900, weekStartsOn: 1, schemaVersion: 1, onboardedAt: '2026-11-01T00:00:00.000Z' };
    await old.table('categories').add(c);
    await old.table('templates').add(t);
    await old.table('activities').add(a);
    await old.table('dayConfigs').add({ id: 'd', createdAt: '', updatedAt: '', date: WEEK, capacityMinutes: 600 });
    await old.table('settings').add(settings);
    old.close();

    const cur = new DaybowlDB(name);
    try {
      expect(await cur.categories.toArray()).toEqual([c]);
      expect(await cur.templates.toArray()).toEqual([t]);
      expect(await cur.activities.where('date').equals(a.date).toArray()).toEqual([a]);
      expect((await cur.dayConfigs.get(WEEK))?.capacityMinutes).toBe(600);
      expect(await cur.settings.get('settings')).toEqual(settings);
    } finally {
      cur.close();
      await Dexie.delete(name);
    }
  });
});
