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

export function IconButton({
  label, onClick, children, disabled, className = '',
}: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-ink-soft transition hover:bg-ink/5 active:bg-ink/10 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Верхня панель екрана. На телефоні — sticky з відступом під Dynamic Island,
 * з `md` — звичайний заголовок під десктопною навігацією.
 */
export function ScreenHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={`sticky top-0 z-20 -mx-4 flex min-h-14 items-center gap-1 bg-paper/90 px-4 pt-[var(--sat)] backdrop-blur max-md:pb-1 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none ${className}`}
    >
      {children}
    </header>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-3 rounded-full px-1 text-sm text-ink-soft"
    >
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-self' : 'bg-ink/20'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
      {label}
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
