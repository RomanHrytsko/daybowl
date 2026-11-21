import { format } from 'date-fns';
import { uk as ukLocale } from 'date-fns/locale';
import type { ReactNode } from 'react';
import type { Activity, Category } from '../domain/types';
import { addDaysStr, parseDate, weekdayOf, type DateStr } from '../domain/dates';
import type { BowlLayer } from '../components/BowlSvg';
import { uk } from '../i18n/uk';

export function toLayers(acts: Activity[], catMap: Map<string, Category>): BowlLayer[] {
  return acts
    .filter((a) => a.status !== 'skipped')
    .map((a) => ({ id: a.id, title: a.title, minutes: a.minutes, color: catMap.get(a.categoryId)?.color ?? '#999' }));
}

export function weekdayShort(d: DateStr) {
  return uk.weekdaysShort[weekdayOf(d) - 1];
}

export function weekdayLong(d: DateStr) {
  return uk.weekdaysLong[weekdayOf(d) - 1];
}

export function dayMonth(d: DateStr) {
  return format(parseDate(d), 'd MMMM', { locale: ukLocale });
}

export function weekRange(weekStart: DateStr) {
  const end = addDaysStr(weekStart, 6);
  const a = parseDate(weekStart);
  const b = parseDate(end);
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? `${format(a, 'd')}–${format(b, 'd MMMM', { locale: ukLocale })}`
    : `${format(a, 'd MMM', { locale: ukLocale })} – ${format(b, 'd MMM', { locale: ukLocale })}`;
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-full text-lg text-ink-soft hover:bg-ink/5"
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-card px-3 py-2 shadow-sm">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${accent ? 'text-self' : ''}`}>{value}</div>
    </div>
  );
}
