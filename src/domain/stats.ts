import type { Activity, Category } from './types';

export interface DayStats {
  capacity: number;
  total: number;
  /** total / capacity, > 1 = переповнення */
  fill: number;
  freeMinutes: number;
  overflowMinutes: number;
  selfMinutes: number;
  byCategory: Record<string, number>;
}

/** Живі справи: не видалені й не пропущені. */
export function liveActivities(acts: Activity[]): Activity[] {
  return acts.filter((a) => !a.deletedAt && a.status !== 'skipped');
}

export function dayStats(
  acts: Activity[],
  capacity: number,
  cats: Map<string, Category>,
): DayStats {
  const live = liveActivities(acts);
  const total = live.reduce((s, a) => s + a.minutes, 0);
  const byCategory: Record<string, number> = {};
  let selfMinutes = 0;
  for (const a of live) {
    byCategory[a.categoryId] = (byCategory[a.categoryId] ?? 0) + a.minutes;
    if (cats.get(a.categoryId)?.kind === 'self') selfMinutes += a.minutes;
  }
  return {
    capacity,
    total,
    fill: capacity > 0 ? total / capacity : total > 0 ? Infinity : 0,
    freeMinutes: Math.max(0, capacity - total),
    overflowMinutes: Math.max(0, total - capacity),
    selfMinutes,
    byCategory,
  };
}

export interface WeekStats {
  capacity: number;
  total: number;
  freeMinutes: number;
  overflowMinutes: number;
  selfMinutes: number;
  byCategory: Record<string, number>;
  overflowDays: number;
}

export function weekStats(days: DayStats[]): WeekStats {
  const res: WeekStats = {
    capacity: 0,
    total: 0,
    freeMinutes: 0,
    overflowMinutes: 0,
    selfMinutes: 0,
    byCategory: {},
    overflowDays: 0,
  };
  for (const d of days) {
    res.capacity += d.capacity;
    res.total += d.total;
    res.freeMinutes += d.freeMinutes;
    res.overflowMinutes += d.overflowMinutes;
    res.selfMinutes += d.selfMinutes;
    if (d.fill > 1) res.overflowDays += 1;
    for (const [k, v] of Object.entries(d.byCategory)) {
      res.byCategory[k] = (res.byCategory[k] ?? 0) + v;
    }
  }
  return res;
}

/** Сортування шарів знизу вгору. */
export function byOrder(a: Activity, b: Activity): number {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt);
}
