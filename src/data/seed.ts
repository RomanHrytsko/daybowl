import { db } from './db';
import type { ActivityTemplate, Category, CategoryKind } from '../domain/types';
import { DEFAULT_SETTINGS, SIZE_MINUTES } from '../domain/types';
import { nowIso, uuid } from '../domain/dates';

const CATEGORIES: [string, string, CategoryKind][] = [
  ['Рутина', '#A8A29E', 'obligation'],
  ['Робота', '#4F7CFF', 'obligation'],
  ['Спорт', '#34B27B', 'self'],
  ['Навчання', '#9B6BDF', 'neutral'],
  ['Відпочинок', '#F2A93B', 'self'],
  ['Близькі', '#E76F8A', 'self'],
];

const TEMPLATES: [string, number, number][] = [
  // назва, індекс категорії, хвилини
  ['Робота', 1, SIZE_MINUTES.XL],
  ['Дорога', 0, SIZE_MINUTES.S],
  ['Готування', 0, SIZE_MINUTES.S],
  ['Прибирання', 0, SIZE_MINUTES.M],
  ['Тренування', 2, SIZE_MINUTES.M],
  ['Прогулянка', 2, SIZE_MINUTES.S],
  ['Курс', 3, SIZE_MINUTES.M],
  ['Читання', 4, SIZE_MINUTES.M],
  ['Хобі', 4, SIZE_MINUTES.L],
  ['Зустріч з друзями', 5, SIZE_MINUTES.L],
];

/** Заповнює порожню базу стартовими категоріями й шаблонами. */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.categories, db.templates, db.settings, async () => {
    if ((await db.categories.count()) > 0) return;
    const now = nowIso();
    const cats: Category[] = CATEGORIES.map(([name, color, kind], order) => ({
      id: uuid(), createdAt: now, updatedAt: now, name, color, kind, order, archived: false,
    }));
    const tpls: ActivityTemplate[] = TEMPLATES.map(([title, ci, minutes]) => ({
      id: uuid(), createdAt: now, updatedAt: now,
      title, categoryId: cats[ci].id, defaultMinutes: minutes, usageCount: 0, archived: false,
    }));
    await db.categories.bulkAdd(cats);
    await db.templates.bulkAdd(tpls);
    if (!(await db.settings.get('settings'))) await db.settings.put(DEFAULT_SETTINGS);
  });
}
