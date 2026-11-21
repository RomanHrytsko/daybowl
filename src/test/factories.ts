import type { Activity, ActivityTemplate, Category } from '../domain/types';

const T = '2026-11-01T00:00:00.000Z';
let n = 0;
const id = (p: string) => `${p}-${++n}`;

export function cat(over: Partial<Category> = {}): Category {
  return {
    id: id('cat'), createdAt: T, updatedAt: T,
    name: 'Cat', color: '#888', kind: 'neutral', order: 0, archived: false,
    ...over,
  };
}

export function act(over: Partial<Activity> = {}): Activity {
  return {
    id: id('act'), createdAt: T, updatedAt: T,
    date: '2026-11-23', title: 'A', categoryId: 'c', minutes: 60,
    source: 'manual', status: 'planned', order: 0,
    ...over,
  };
}

export function tpl(over: Partial<ActivityTemplate> = {}): ActivityTemplate {
  return {
    id: id('tpl'), createdAt: T, updatedAt: T,
    title: 'T', categoryId: 'c', defaultMinutes: 60, usageCount: 0, archived: false,
    ...over,
  };
}
