import { useState } from 'react';
import type { ActivityTemplate, Category } from '../../domain/types';
import { sizeOf } from '../../domain/types';
import { formatHours } from '../../domain/format';
import { uk } from '../../i18n/uk';
import { SizePicker } from '../SizePicker';

interface Props {
  templates: ActivityTemplate[];
  categories: Category[];
  onPick: (t: ActivityTemplate) => void;
  onCustom: (input: { title: string; categoryId: string; minutes: number }) => void;
}

/** Ряд чипів у кольорах категорій: тап — справа падає в чашу. */
export function TemplateChips({ templates, categories, onPick, onCustom }: Props) {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const chips = templates
    .filter((t) => !t.archived && !cats.get(t.categoryId)?.archived)
    .sort((a, b) => b.usageCount - a.usageCount || a.title.localeCompare(b.title, 'uk'));
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {chips.map((t) => {
          const c = cats.get(t.categoryId);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition active:scale-95 hover:shadow-sm"
              style={{ borderColor: c?.color, background: `${c?.color ?? '#888'}1f` }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c?.color }} aria-hidden />
              {t.title}
              <span className="text-xs text-ink-soft">{sizeOf(t.defaultMinutes) ?? formatHours(t.defaultMinutes)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center rounded-full border border-dashed border-ink/30 px-3.5 text-sm text-ink-soft hover:border-ink/60"
        >
          + {uk.day.custom}
        </button>
      </div>
      {open && (
        <CustomForm
          categories={categories.filter((c) => !c.archived)}
          onSubmit={(v) => {
            onCustom(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CustomForm({
  categories, onSubmit,
}: {
  categories: Category[];
  onSubmit: (v: { title: string; categoryId: string; minutes: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [minutes, setMinutes] = useState(60);
  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl bg-card p-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !categoryId) return;
        onSubmit({ title: title.trim(), categoryId, minutes });
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={uk.day.titlePh}
        aria-label={uk.day.titlePh}
        enterKeyHint="done"
        autoCapitalize="sentences"
        autoCorrect="on"
        onKeyDown={(e) => e.key === 'Enter' && !title.trim() && e.preventDefault()}
        className="field w-full"
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label={uk.day.category}
        className="field-select w-full"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <SizePicker minutes={minutes} onChange={setMinutes} />
      <button type="submit" className="btn-solid w-full text-base" disabled={!title.trim()}>{uk.day.add}</button>
    </form>
  );
}
