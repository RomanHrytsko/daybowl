import { db } from './db';
import type { Activity, ActivityTemplate, Category, DayConfig, Settings } from '../domain/types';

export const BACKUP_FORMAT = 'daybowl-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  settings: Settings[];
  categories: Category[];
  templates: ActivityTemplate[];
  activities: Activity[];
  dayConfigs: DayConfig[];
}

export async function exportData(): Promise<Backup> {
  const [settings, categories, templates, activities, dayConfigs] = await Promise.all([
    db.settings.toArray(),
    db.categories.toArray(),
    db.templates.toArray(),
    db.activities.toArray(),
    db.dayConfigs.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(),
    settings, categories, templates, activities, dayConfigs,
  };
}

export function parseBackup(json: string): Backup {
  const data = JSON.parse(json) as Partial<Backup>;
  if (data.format !== BACKUP_FORMAT || data.version !== 1) {
    throw new Error('Невідомий формат файлу');
  }
  for (const k of ['settings', 'categories', 'templates', 'activities', 'dayConfigs'] as const) {
    if (!Array.isArray(data[k])) throw new Error(`Немає розділу «${k}»`);
  }
  return data as Backup;
}

/** Повністю замінює поточні дані вмістом резервної копії. */
export async function importData(b: Backup): Promise<void> {
  await db.transaction('rw', [db.settings, db.categories, db.templates, db.activities, db.dayConfigs], async () => {
    await Promise.all([
      db.settings.clear(), db.categories.clear(), db.templates.clear(),
      db.activities.clear(), db.dayConfigs.clear(),
    ]);
    await db.settings.bulkAdd(b.settings);
    await db.categories.bulkAdd(b.categories);
    await db.templates.bulkAdd(b.templates);
    await db.activities.bulkAdd(b.activities);
    await db.dayConfigs.bulkAdd(b.dayConfigs);
  });
}

export function downloadBackup(b: Backup) {
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daybowl-${b.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
