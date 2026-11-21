import { db } from '../db';
import type { ActivityTemplate } from '../../domain/types';
import { nowIso, uuid } from '../../domain/dates';

export type TemplateInput = Pick<ActivityTemplate, 'title' | 'categoryId' | 'defaultMinutes'> &
  Partial<Pick<ActivityTemplate, 'recurrence' | 'energy'>>;

export async function createTemplate(input: TemplateInput): Promise<ActivityTemplate> {
  const now = nowIso();
  const t: ActivityTemplate = {
    id: uuid(), createdAt: now, updatedAt: now,
    usageCount: 0, archived: false, ...input,
  };
  await db.templates.add(t);
  return t;
}

export async function updateTemplate(id: string, patch: Partial<Omit<ActivityTemplate, 'id'>>) {
  await db.templates.update(id, { ...patch, updatedAt: nowIso() });
}

export async function bumpUsage(id: string) {
  await db.templates.where('id').equals(id).modify((t) => {
    t.usageCount += 1;
  });
}
