import type { Activity, ActivityTemplate } from './types';
import { nowIso, uuid, weekDates, weekdayOf, type DateStr } from './dates';

export function occursOn(t: ActivityTemplate, date: DateStr): boolean {
  const r = t.recurrence;
  if (!r || t.archived) return false;
  if (date < r.startDate) return false;
  if (r.endDate && date > r.endDate) return false;
  return r.weekdays.includes(weekdayOf(date));
}

/**
 * Повертає нові Activity з source 'recurrence' для кожної пари (шаблон, дата)
 * тижня, якої ще немає серед `existing`. Записи з deletedAt теж рахуються
 * як «є», тож видалений повтор не повертається. Ідемпотентна.
 */
export function materializeRecurrences(
  weekStart: DateStr,
  templates: ActivityTemplate[],
  existing: Activity[],
  now: string = nowIso(),
): Activity[] {
  const have = new Set(
    existing.filter((a) => a.templateId).map((a) => `${a.templateId}|${a.date}`),
  );
  const nextOrder = new Map<string, number>();
  for (const a of existing) {
    nextOrder.set(a.date, Math.max(nextOrder.get(a.date) ?? 0, a.order + 1));
  }
  const out: Activity[] = [];
  for (const date of weekDates(weekStart)) {
    for (const t of templates) {
      if (!occursOn(t, date)) continue;
      const key = `${t.id}|${date}`;
      if (have.has(key)) continue;
      have.add(key);
      const order = nextOrder.get(date) ?? 0;
      nextOrder.set(date, order + 1);
      out.push({
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        date,
        title: t.title,
        categoryId: t.categoryId,
        minutes: t.defaultMinutes,
        energy: t.energy,
        templateId: t.id,
        source: 'recurrence',
        status: 'planned',
        order,
      });
    }
  }
  return out;
}
