import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { activitiesOfWeek, ensureRecurrences } from '../data/repos/activities';
import { getSettings } from '../data/repos/settings';
import { addDaysStr, weekDates, type DateStr } from '../domain/dates';
import { byOrder, dayStats, weekStats, type DayStats, type WeekStats } from '../domain/stats';
import type { Activity, ActivityTemplate, Category, Settings } from '../domain/types';

export interface DayView {
  date: DateStr;
  /** живі шари знизу вгору (пропущені теж — показуються блідо) */
  layers: Activity[];
  stats: DayStats;
  customCapacity: boolean;
}

export interface WeekView {
  weekStart: DateStr;
  days: DayView[];
  stats: WeekStats;
}

export function useCatalog() {
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const catMap = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);
  return { categories, templates, settings, catMap };
}

/** Генерує повтори для тижнів щоразу, як змінюються шаблони. */
export function useRecurrences(weekStarts: DateStr[], templates: ActivityTemplate[] | undefined) {
  const key = weekStarts.join(',');
  useEffect(() => {
    if (!templates) return;
    (async () => {
      for (const w of key.split(',')) await ensureRecurrences(w);
    })();
  }, [key, templates]);
}

export async function loadWeek(
  weekStart: DateStr, settings: Settings, catMap: Map<string, Category>,
): Promise<WeekView> {
  const end = addDaysStr(weekStart, 6);
  const [acts, configs] = await Promise.all([
    activitiesOfWeek(weekStart),
    db.dayConfigs.where('date').between(weekStart, end, true, true).toArray(),
  ]);
  const cfg = new Map(configs.map((c) => [c.date, c]));
  const days = weekDates(weekStart).map((date): DayView => {
    const dayActs = acts.filter((a) => a.date === date && !a.deletedAt).sort(byOrder);
    const custom = cfg.get(date)?.capacityMinutes;
    const capacity = custom ?? settings.defaultCapacityMinutes;
    return {
      date,
      layers: dayActs,
      stats: dayStats(dayActs, capacity, catMap),
      customCapacity: custom !== undefined,
    };
  });
  return { weekStart, days, stats: weekStats(days.map((d) => d.stats)) };
}

export function useWeek(weekStart: DateStr) {
  const catalog = useCatalog();
  const { templates, settings, catMap } = catalog;
  useRecurrences([weekStart], templates);
  const week = useLiveQuery(
    () => (settings ? loadWeek(weekStart, settings, catMap) : undefined),
    [weekStart, settings, catMap],
  );
  return { ...catalog, week };
}
