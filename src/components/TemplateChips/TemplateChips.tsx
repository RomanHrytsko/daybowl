import { useState } from 'react';
import type { ActivityTemplate, Category } from '../../domain/types';
import { sizeOf } from '../../domain/types';
import { formatHours } from '../../domain/format';
import { uk } from '../../i18n/uk';
import { groupTemplates } from './group';
import { SizePicker } from '../SizePicker';
import { useUi } from '../../state/uiStore';

interface Props {
  templates: ActivityTemplate[];
  categories: Category[];
  onPick: (t: ActivityTemplate) => void;
  onCustom: (input: { title: string; categoryId: string; minutes: number }) => void;
}

/** Шаблони, згруповані у розкривні секції за категоріями: тап по чипу — справа падає в чашу. */
export function TemplateChips({ templates, categories, onPick, onCustom }: Props) {
  const groups = groupTemplates(templates, categories);
  const openGroups = useUi((s) => s.openTemplateGroups);
  const toggleGroup = useUi((s) => s.toggleTemplateGroup);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {groups.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={uk.day.templateGroups}>
          {groups.map(({ category: c, templates: items }) => (
            <CategoryGroup
              key={c.id}
              category={c}
              templates={items}
              open={openGroups.includes(c.id)}
              onToggle={() => toggleGroup(c.id)}
              onPick={onPick}
            />
          ))}
        </ul>
      )}
      <div>
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

function CategoryGroup({
  category: c, templates, open, onToggle, onPick,
}: {
  category: Category;
  templates: ActivityTemplate[];
  open: boolean;
  onToggle: () => void;
  onPick: (t: ActivityTemplate) => void;
}) {
  const panelId = `tpl-group-${c.id}`;
  return (
    <li className="rounded-xl bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-1 text-left"
      >
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
        <span className="text-xs text-ink-soft" aria-label={uk.day.groupCount(templates.length)}>{templates.length}</span>
        <span
          className={`text-ink-soft transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open && (
        <div id={panelId} className="flex flex-wrap gap-2 px-3 pt-1 pb-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition active:scale-95 hover:shadow-sm"
              style={{ borderColor: c.color, background: `${c.color}1f` }}
            >
              {t.title}
              <span className="text-xs text-ink-soft">{sizeOf(t.defaultMinutes) ?? formatHours(t.defaultMinutes)}</span>
            </button>
          ))}
        </div>
      )}
    </li>
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
