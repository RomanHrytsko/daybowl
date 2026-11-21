import type { Activity } from './types';
import { addDaysStr, nowIso, uuid, weekDates, type DateStr } from './dates';

/**
 * Копіює живі справи тижня `from` з source !== 'recurrence' (повтори
 * створяться самі) у тиждень `to` з source 'copy'. Шари додаються поверх
 * уже наявних справ цільового дня.
 */
export function copyWeek(
  from: DateStr,
  to: DateStr,
  fromActs: Activity[],
  toActs: Activity[],
  now: string = nowIso(),
): Activity[] {
  const fromDays = new Set(weekDates(from));
  const nextOrder = new Map<string, number>();
  for (const a of toActs) {
    nextOrder.set(a.date, Math.max(nextOrder.get(a.date) ?? 0, a.order + 1));
  }
  const offset = Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000,
  );
  return fromActs
    .filter((a) => fromDays.has(a.date) && !a.deletedAt && a.source !== 'recurrence')
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
    .map((a) => {
      const date = addDaysStr(a.date, offset);
      const order = nextOrder.get(date) ?? 0;
      nextOrder.set(date, order + 1);
      return {
        ...a,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        date,
        source: 'copy' as const,
        status: 'planned' as const,
        order,
      };
    });
}
