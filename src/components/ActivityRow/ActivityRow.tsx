import { useState } from 'react';
import type { Activity, Category } from '../../domain/types';
import { formatHours } from '../../domain/format';
import { parseDate, weekDates, weekStartOf } from '../../domain/dates';
import { uk } from '../../i18n/uk';
import { SizePicker } from '../SizePicker';
import { TextField } from '../TextField';
import { ConfirmSheet } from '../ConfirmSheet';
import { deleteActivity, moveActivity, shiftActivity, updateActivity } from '../../data/repos/activities';

interface Props {
  activity: Activity;
  category?: Category;
  categories: Category[];
  isTop: boolean;
  isBottom: boolean;
  /** розгорнутим може бути лише один рядок — стан тримає екран дня */
  open: boolean;
  onToggle: () => void;
}

/** Рядок справи: розмір змінюється одним тапом, решта — в розгорнутих деталях. */
export function ActivityRow({ activity: a, category, categories, isTop, isBottom, open, onToggle }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const days = weekDates(weekStartOf(a.date));
  const detailsId = `act-${a.id}`;

  return (
    <li className="rounded-xl bg-card px-3 py-2 shadow-sm">
      <div className="flex min-h-11 items-center gap-2 py-0.5">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: category?.color }} aria-hidden />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={detailsId}
          className="min-h-11 min-w-24 flex-1 text-left min-[400px]:min-w-30"
        >
          <div className="truncate font-medium">{a.title}</div>
          <div className="truncate text-xs text-ink-soft">
            {category?.name} · {formatHours(a.minutes)}
          </div>
        </button>
        <SizePicker variant="touch" minutes={a.minutes} onChange={(m) => updateActivity(a.id, { minutes: m })} />
      </div>

      {open && (
        <div id={detailsId} className="mt-2 flex flex-col gap-3 border-t border-ink/10 pt-3">
          <TextField
            value={a.title}
            onSave={(title) => updateActivity(a.id, { title })}
            aria-label={uk.day.titlePh}
            className="w-full"
          />
          <select
            value={a.categoryId}
            onChange={(e) => updateActivity(a.id, { categoryId: e.target.value })}
            aria-label={uk.day.category}
            className="field-select w-full"
          >
            {categories.filter((c) => !c.archived || c.id === a.categoryId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <SizePicker exact minutes={a.minutes} onChange={(m) => updateActivity(a.id, { minutes: m })} />
          <div className="flex items-center gap-2">
            <select
              value=""
              aria-label={uk.day.moveTo}
              onChange={(e) => e.target.value && moveActivity(a, e.target.value)}
              className="field-select min-w-0 flex-1"
            >
              <option value="">{uk.day.moveTo}</option>
              {days.filter((d) => d !== a.date).map((d) => (
                <option key={d} value={d}>
                  {uk.weekdaysShort[(parseDate(d).getDay() + 6) % 7]} {Number(d.slice(8))}
                </option>
              ))}
            </select>
            <button type="button" disabled={isTop} onClick={() => shiftActivity(a, 1)} className="btn-ghost" aria-label={uk.day.up}>
              ↑<span className="max-[400px]:sr-only">{uk.day.up}</span>
            </button>
            <button type="button" disabled={isBottom} onClick={() => shiftActivity(a, -1)} className="btn-ghost" aria-label={uk.day.down}>
              ↓<span className="max-[400px]:sr-only">{uk.day.down}</span>
            </button>
          </div>
          <div className="mt-1 border-t border-ink/10 pt-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost w-full text-rose-700 dark:text-rose-400"
            >
              {uk.day.delete}
            </button>
          </div>
        </div>
      )}
      <ConfirmSheet
        open={confirmDelete}
        title={uk.day.deleteConfirm(a.title)}
        message={uk.day.deleteHint}
        confirmLabel={uk.day.delete}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteActivity(a);
        }}
      />
    </li>
  );
}
