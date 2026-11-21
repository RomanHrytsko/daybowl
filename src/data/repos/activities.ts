import { db } from '../db';
import type { Activity, ActivityTemplate } from '../../domain/types';
import { addDaysStr, nowIso, uuid, type DateStr } from '../../domain/dates';
import { materializeRecurrences } from '../../domain/recurrence';
import { copyWeek as copyWeekDomain } from '../../domain/copyWeek';
import { byOrder } from '../../domain/stats';
import { bumpUsage } from './templates';

export function activitiesOfWeek(weekStart: DateStr) {
  return db.activities.where('date').between(weekStart, addDaysStr(weekStart, 6), true, true).toArray();
}

async function nextOrder(date: DateStr): Promise<number> {
  const acts = await db.activities.where('date').equals(date).toArray();
  return acts.reduce((m, a) => Math.max(m, a.order + 1), 0);
}

export async function addFromTemplate(date: DateStr, t: ActivityTemplate): Promise<Activity> {
  return db.transaction('rw', db.activities, db.templates, async () => {
    const a = await addActivity({
      date, title: t.title, categoryId: t.categoryId, minutes: t.defaultMinutes,
      energy: t.energy, templateId: t.id,
    });
    await bumpUsage(t.id);
    return a;
  });
}

export async function addActivity(
  input: Pick<Activity, 'date' | 'title' | 'categoryId' | 'minutes'> &
    Partial<Pick<Activity, 'energy' | 'templateId'>>,
): Promise<Activity> {
  const now = nowIso();
  const a: Activity = {
    id: uuid(), createdAt: now, updatedAt: now,
    source: 'manual', status: 'planned', order: await nextOrder(input.date),
    ...input,
  };
  await db.activities.add(a);
  return a;
}

export async function updateActivity(id: string, patch: Partial<Omit<Activity, 'id'>>) {
  await db.activities.update(id, { ...patch, updatedAt: nowIso() });
}

/**
 * Повтори лишаються як tombstone, щоб не згенеруватися знову;
 * решта видаляється фізично.
 */
export async function deleteActivity(a: Activity) {
  if (a.source === 'recurrence') {
    await updateActivity(a.id, { deletedAt: nowIso() });
  } else {
    await db.activities.delete(a.id);
  }
}

/** Переносить справу на інший день, кладучи її верхнім шаром. */
export async function moveActivity(a: Activity, date: DateStr) {
  if (a.date === date) return;
  await db.transaction('rw', db.activities, async () => {
    const order = await nextOrder(date);
    if (a.source === 'recurrence') {
      // залишаємо tombstone на старому дні, щоб повтор не повернувся
      await updateActivity(a.id, { deletedAt: nowIso() });
      const now = nowIso();
      await db.activities.add({
        ...a, id: uuid(), createdAt: now, updatedAt: now,
        date, order, source: 'manual', deletedAt: undefined,
      });
    } else {
      await updateActivity(a.id, { date, order });
    }
  });
}

/** Зсуває шар на одну позицію вгору (+1) або вниз (−1) серед живих шарів дня. */
export async function shiftActivity(a: Activity, dir: 1 | -1) {
  await db.transaction('rw', db.activities, async () => {
    const live = (await db.activities.where('date').equals(a.date).toArray())
      .filter((x) => !x.deletedAt)
      .sort(byOrder);
    const i = live.findIndex((x) => x.id === a.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= live.length) return;
    [live[i], live[j]] = [live[j], live[i]];
    const now = nowIso();
    await db.activities.bulkPut(live.map((x, k) => ({ ...x, order: k, updatedAt: now })));
  });
}

/** Ідемпотентно створює повторювані справи для тижня. */
export async function ensureRecurrences(weekStart: DateStr) {
  await db.transaction('rw', db.activities, db.templates, async () => {
    const templates = (await db.templates.toArray()).filter((t) => t.recurrence && !t.archived);
    if (!templates.length) return;
    const existing = await activitiesOfWeek(weekStart);
    const fresh = materializeRecurrences(weekStart, templates, existing);
    if (fresh.length) await db.activities.bulkAdd(fresh);
  });
}

export async function copyWeek(from: DateStr, to: DateStr): Promise<number> {
  return db.transaction('rw', db.activities, async () => {
    const [src, dst] = await Promise.all([activitiesOfWeek(from), activitiesOfWeek(to)]);
    const fresh = copyWeekDomain(from, to, src, dst);
    await db.activities.bulkAdd(fresh);
    return fresh.length;
  });
}
