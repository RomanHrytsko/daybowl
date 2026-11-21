export type CategoryKind = 'obligation' | 'self' | 'neutral';
export type Size = 'S' | 'M' | 'L' | 'XL';
export type Energy = -1 | 0 | 1;
export type ActivitySource = 'manual' | 'recurrence' | 'copy';
export type ActivityStatus = 'planned' | 'done' | 'skipped';

export const SIZES: Size[] = ['S', 'M', 'L', 'XL'];
export const SIZE_MINUTES: Record<Size, number> = { S: 30, M: 60, L: 120, XL: 240 };

/** Розмір, що точно відповідає хвилинам, або undefined для довільного числа. */
export function sizeOf(minutes: number): Size | undefined {
  return SIZES.find((s) => SIZE_MINUTES[s] === minutes);
}

export interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends Base {
  name: string;
  color: string;
  kind: CategoryKind;
  order: number;
  archived: boolean;
}

export interface Recurrence {
  /** 1 = пн … 7 = нд */
  weekdays: number[];
  startDate: string;
  endDate?: string;
}

export interface ActivityTemplate extends Base {
  title: string;
  categoryId: string;
  defaultMinutes: number;
  energy?: Energy;
  recurrence?: Recurrence;
  usageCount: number;
  archived: boolean;
}

export interface Activity extends Base {
  date: string;
  title: string;
  categoryId: string;
  minutes: number;
  energy?: Energy;
  templateId?: string;
  source: ActivitySource;
  status: ActivityStatus;
  /** порядок шарів знизу вгору */
  order: number;
  /** tombstone: видалений повтор не генерується знову */
  deletedAt?: string;
}

export interface DayConfig extends Base {
  date: string;
  capacityMinutes?: number;
  note?: string;
}

export interface Settings {
  id: 'settings';
  defaultCapacityMinutes: number;
  weekStartsOn: 1;
  schemaVersion: number;
  /** коли користувач завершив перше налаштування */
  onboardedAt?: string;
  /** коли востаннє завантажено резервну копію (ISO) */
  lastBackupAt?: string;
  /** коли закрито підказку «Встанови як застосунок» (ISO) */
  installHintDismissedAt?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  defaultCapacityMinutes: 960,
  weekStartsOn: 1,
  schemaVersion: 1,
};
