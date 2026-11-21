import { db } from './db';
import { updateSettings } from './repos/settings';
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

export function backupFileName(b: Backup) {
  return `daybowl-${b.exportedAt.slice(0, 10)}.json`;
}

export function downloadBackup(b: Backup) {
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari читає blob асинхронно — не відкликаємо URL одразу
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 'shared' — файл передано в меню «Поділитися» чи завантажено; 'cancelled' — користувач закрив меню. */
export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Зберігає копію. На iOS (особливо у встановленому застосунку) `<a download>` не працює,
 * тож відкриваємо меню «Поділитися» → «Зберегти в Файли».
 *
 * `navigator.share` вимагає жесту користувача: між тапом і викликом не має бути `await`.
 * Тому дані краще підготувати заздалегідь (`useBackupSnapshot`) і передати сюди як `prepared`.
 */
export async function saveBackup(prepared?: Backup, shareTitle = 'Чаша дня — копія'): Promise<SaveResult> {
  const b: Backup = prepared
    ? { ...prepared, exportedAt: new Date().toISOString() }
    : await exportData();
  const file = new File([JSON.stringify(b, null, 2)], backupFileName(b), { type: 'application/json' });
  let result: SaveResult;
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle });
      result = 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // NotAllowedError (жест втрачено) та інше — пробуємо звичайне завантаження
      downloadBackup(b);
      result = 'downloaded';
    }
  } else {
    downloadBackup(b);
    result = 'downloaded';
  }
  await updateSettings({ lastBackupAt: b.exportedAt });
  return result;
}

export const BACKUP_REMIND_DAYS = 7;

/**
 * Скільки днів минуло від останньої копії, якщо пора нагадати; інакше null.
 * Без жодної копії відлік іде від завершення онбордингу.
 */
export function backupOverdueDays(
  s: { lastBackupAt?: string; onboardedAt?: string },
  hasActivities: boolean,
  now: Date = new Date(),
): number | null {
  if (!hasActivities) return null;
  const since = s.lastBackupAt ?? s.onboardedAt;
  if (!since) return null;
  const days = Math.floor((now.getTime() - new Date(since).getTime()) / 86_400_000);
  return days >= BACKUP_REMIND_DAYS ? days : null;
}
