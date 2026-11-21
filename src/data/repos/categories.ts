import { db } from '../db';
import type { Category } from '../../domain/types';
import { nowIso, uuid } from '../../domain/dates';

export type CategoryInput = Pick<Category, 'name' | 'color' | 'kind'>;

export async function createCategory(input: CategoryInput): Promise<Category> {
  const last = await db.categories.orderBy('order').last();
  const now = nowIso();
  const c: Category = {
    id: uuid(), createdAt: now, updatedAt: now,
    ...input, order: (last?.order ?? -1) + 1, archived: false,
  };
  await db.categories.add(c);
  return c;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>) {
  await db.categories.update(id, { ...patch, updatedAt: nowIso() });
}

export interface CategoryUsage {
  activities: number;
  templates: number;
}

/** Скільки живих справ і шаблонів посилаються на категорію. */
export async function categoryUsage(id: string): Promise<CategoryUsage> {
  const [activities, templates] = await Promise.all([
    db.activities.filter((a) => a.categoryId === id && !a.deletedAt).count(),
    db.templates.filter((t) => t.categoryId === id).count(),
  ]);
  return { activities, templates };
}

export class CategoryInUseError extends Error {
  readonly usage: CategoryUsage;
  constructor(usage: CategoryUsage) {
    super('Категорія використовується');
    this.usage = usage;
  }
}

/** Видаляє категорію, лише якщо на неї ніщо не посилається. */
export async function deleteCategory(id: string): Promise<void> {
  await db.transaction('rw', [db.activities, db.templates, db.categories], async () => {
    const usage = await categoryUsage(id);
    if (usage.activities || usage.templates) throw new CategoryInUseError(usage);
    // лишились тільки tombstone-и видалених повторів
    await db.activities.filter((a) => a.categoryId === id).delete();
    await db.categories.delete(id);
  });
}

/** Переносить усі справи й шаблони в іншу категорію і видаляє цю — однією транзакцією. */
export async function reassignAndDeleteCategory(id: string, targetId: string): Promise<void> {
  if (id === targetId) throw new Error('Оберіть іншу категорію');
  await db.transaction('rw', [db.activities, db.templates, db.categories], async () => {
    if (!(await db.categories.get(targetId))) throw new Error('Категорію не знайдено');
    const updatedAt = nowIso();
    await db.activities.filter((a) => a.categoryId === id).modify({ categoryId: targetId, updatedAt });
    await db.templates.filter((t) => t.categoryId === id).modify({ categoryId: targetId, updatedAt });
    await db.categories.delete(id);
  });
}
