import { useLiveQuery } from 'dexie-react-hooks';
import { useCatalog, useRecurrences, loadWeek } from '../state/useWeek';
import { useUi } from '../state/uiStore';
import { addDaysStr } from '../domain/dates';
import { formatHours } from '../domain/format';
import { uk } from '../i18n/uk';
import { IconButton, Stat, weekRange } from './shared';

export function SummaryScreen() {
  const { weekStart, setWeek } = useUi();
  const { categories, templates, settings, catMap } = useCatalog();
  const starts = [-21, -14, -7, 0].map((d) => addDaysStr(weekStart, d));
  useRecurrences(starts, templates);
  const weeks = useLiveQuery(
    () => (settings ? Promise.all(starts.map((w) => loadWeek(w, settings, catMap))) : undefined),
    [weekStart, settings, catMap],
  );
  if (!weeks || !categories) return null;

  const cur = weeks[3].stats;
  const prev = weeks[2].stats;
  const delta = cur.selfMinutes - prev.selfMinutes;
  const deltaStr = `${delta >= 0 ? '+' : '−'}${formatHours(Math.abs(delta))}`;
  const maxSelf = Math.max(60, ...weeks.map((w) => w.stats.selfMinutes));
  const cats = categories
    .map((c) => ({ c, m: cur.byCategory[c.id] ?? 0 }))
    .filter((x) => x.m > 0)
    .sort((a, b) => b.m - a.m);
  const maxCat = Math.max(1, ...cats.map((x) => x.m));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{uk.summary.title}</h1>
        <div className="flex items-center gap-1">
          <IconButton label={uk.week.prev} onClick={() => setWeek(addDaysStr(weekStart, -7))}>‹</IconButton>
          <div className="min-w-32 text-center font-medium">{weekRange(weekStart)}</div>
          <IconButton label={uk.week.next} onClick={() => setWeek(addDaysStr(weekStart, 7))}>›</IconButton>
        </div>
      </header>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="text-sm text-ink-soft">{uk.summary.self}</div>
        <div className="text-5xl font-semibold tabular-nums text-self">{formatHours(cur.selfMinutes)}</div>
        <div className="mt-1 text-sm text-ink-soft">{uk.summary.vsLast(deltaStr)}</div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={uk.summary.overflowDays} value={String(cur.overflowDays)} />
        <Stat label={uk.summary.free} value={formatHours(cur.freeMinutes)} />
      </div>

      <section>
        <h2 className="mb-2 font-medium">{uk.summary.byCategory}</h2>
        <ul className="flex flex-col gap-2">
          {cats.map(({ c, m }) => (
            <li key={c.id} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 text-sm">
              <span className="truncate">{c.name}</span>
              <span className="h-3 rounded-full bg-ink/5">
                <span className="block h-3 rounded-full" style={{ width: `${(m / maxCat) * 100}%`, background: c.color }} />
              </span>
              <span className="text-right tabular-nums text-ink-soft">{formatHours(m)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-medium">{uk.summary.trend}</h2>
        <div className="flex h-36 items-end gap-3">
          {weeks.map((w, i) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-ink-soft">{formatHours(w.stats.selfMinutes)}</span>
              <span
                className={`w-full rounded-t-lg ${i === 3 ? 'bg-self' : 'bg-self/35'}`}
                style={{ height: `${Math.max(2, (w.stats.selfMinutes / maxSelf) * 96)}px` }}
              />
              <span className="text-xs text-ink-soft">{weekRange(w.weekStart).split('–')[0]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
