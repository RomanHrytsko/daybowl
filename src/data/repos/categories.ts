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
