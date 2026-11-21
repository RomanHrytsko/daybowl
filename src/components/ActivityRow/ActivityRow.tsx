import { useState } from 'react';
import type { Activity, Category } from '../../domain/types';
import { formatHours } from '../../domain/format';
import { parseDate, weekDates, weekStartOf } from '../../domain/dates';
import { uk } from '../../i18n/uk';
import { SizePicker } from '../SizePicker';
import { deleteActivity, moveActivity, shiftActivity, updateActivity } from '../../data/repos/activities';

interface Props {
  activity: Activity;
  category?: Category;
  categories: Category[];
  isTop: boolean;
  isBottom: boolean;
}

/** Рядок справи: розмір змінюється одним тапом, решта — в розгорнутих деталях. */
export function ActivityRow({ activity: a, category, categories, isTop, isBottom }: Props) {
  const [open, setOpen] = useState(false);
  const days = weekDates(weekStartOf(a.date));

  return (
    <li className="rounded-xl bg-card px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: category?.color }} aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate font-medium">{a.title}</div>
          <div className="text-xs text-ink-soft">
            {category?.name} · {formatHours(a.minutes)}
          </div>
        </button>
        <SizePicker compact minutes={a.minutes} onChange={(m) => updateActivity(a.id, { minutes: m })} />
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <input
              defaultValue={a.title}
              onBlur={(e) => e.target.value.trim() && updateActivity(a.id, { title: e.target.value.trim() })}
              aria-label={uk.day.titlePh}
              className="min-w-0 flex-1 rounded-md border border-ink/15 bg-transparent px-2 py-1"
            />
            <select
              value={a.categoryId}
              onChange={(e) => updateActivity(a.id, { categoryId: e.target.value })}
              aria-label="Категорія"
              className="rounded-md border border-ink/15 bg-transparent px-2 py-1"
            >
              {categories.filter((c) => !c.archived || c.id === a.categoryId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <SizePicker exact minutes={a.minutes} onChange={(m) => updateActivity(a.id, { minutes: m })} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={isTop} onClick={() => shiftActivity(a, 1)} className="btn-ghost">
              ↑ {uk.day.up}
            </button>
            <button type="button" disabled={isBottom} onClick={() => shiftActivity(a, -1)} className="btn-ghost">
              ↓ {uk.day.down}
            </button>
            <label className="flex items-center gap-1 text-ink-soft">
              {uk.day.moveTo}
              <select
                value=""
                onChange={(e) => e.target.value && moveActivity(a, e.target.value)}
                className="rounded-md border border-ink/15 bg-transparent px-2 py-1"
              >
                <option value="">—</option>
                {days.filter((d) => d !== a.date).map((d) => (
                  <option key={d} value={d}>
                    {uk.weekdaysShort[(parseDate(d).getDay() + 6) % 7]} {d.slice(8)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => deleteActivity(a)} className="btn-ghost ml-auto text-rose-700">
              {uk.day.delete}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
