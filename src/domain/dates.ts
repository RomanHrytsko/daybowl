import { addDays, format, getISODay, parseISO, startOfWeek } from 'date-fns';

/** Дата у форматі YYYY-MM-DD в локальному часовому поясі. */
export type DateStr = string;

export function toDateStr(d: Date): DateStr {
  return format(d, 'yyyy-MM-dd');
}

export function parseDate(s: DateStr): Date {
  return parseISO(s);
}

export function today(): DateStr {
  return toDateStr(new Date());
}

export function weekStartOf(date: DateStr): DateStr {
  return toDateStr(startOfWeek(parseDate(date), { weekStartsOn: 1 }));
}

export function addDaysStr(date: DateStr, n: number): DateStr {
  return toDateStr(addDays(parseDate(date), n));
}

export function weekDates(weekStart: DateStr): DateStr[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
}

/** 1 = пн … 7 = нд */
export function weekdayOf(date: DateStr): number {
  return getISODay(parseDate(date));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function uuid(): string {
  return crypto.randomUUID();
}
