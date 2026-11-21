import { useState } from 'react';
import { useCatalog } from '../state/useWeek';
import {
  categoryUsage, createCategory, deleteCategory, reassignAndDeleteCategory, updateCategory, type CategoryUsage,
} from '../data/repos/categories';
import { createTemplate, deleteTemplate, updateTemplate } from '../data/repos/templates';
import { useUi } from '../state/uiStore';
import { SizePicker } from '../components/SizePicker';
import { TextField } from '../components/TextField';
import { ActionSheet, ConfirmSheet, Sheet } from '../components/ConfirmSheet';
import { today } from '../domain/dates';
import type { ActivityTemplate, Category, CategoryKind } from '../domain/types';
import { uk } from '../i18n/uk';
import { IconButton, ScreenHeader, Switch } from './shared';

const KINDS: CategoryKind[] = ['obligation', 'self', 'neutral'];

export function TemplatesScreen() {
  const { categories, templates } = useCatalog();
  const [showArchived, setShowArchived] = useState(false);
  /** щойно створений запис — фокус на його назві */
  const [focusId, setFocusId] = useState<string | null>(null);

  const header = (
    <ScreenHeader>
      <h1 className="mr-auto text-lg font-semibold md:sr-only">{uk.nav.templates}</h1>
      <Switch checked={showArchived} onChange={setShowArchived} label={uk.templates.archived} />
    </ScreenHeader>
  );
  if (!categories || !templates) return header;
  const visibleCats = categories.filter((c) => showArchived || !c.archived);
  const visibleTpls = templates
    .filter((t) => showArchived || !t.archived)
    .sort((a, b) => a.title.localeCompare(b.title, 'uk'));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {header}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{uk.templates.categories}</h2>
          <button
            type="button"
            className="btn-ghost -mr-3"
            onClick={async () => {
              const c = await createCategory({ name: uk.templates.newCategory, color: '#6B9AC4', kind: 'neutral' });
              setFocusId(c.id);
            }}
          >
            + {uk.templates.newCategory}
          </button>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {visibleCats.map((c) => <CategoryRow key={c.id} c={c} all={categories} autoFocus={focusId === c.id} />)}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{uk.templates.templates}</h2>
          <button
            type="button"
            className="btn-ghost -mr-3"
            onClick={async () => {
              const t = await createTemplate({
                title: uk.templates.newTemplate,
                categoryId: categories.find((c) => !c.archived)?.id ?? categories[0]?.id ?? '',
                defaultMinutes: 60,
              });
              setFocusId(t.id);
            }}
          >
            + {uk.templates.newTemplate}
          </button>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {visibleTpls.map((t) => (
            <TemplateRow key={t.id} t={t} categories={categories} autoFocus={focusId === t.id} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CategoryRow({ c, all, autoFocus }: { c: Category; all: Category[]; autoFocus: boolean }) {
  const showToast = useUi((s) => s.showToast);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [usage, setUsage] = useState<CategoryUsage | null>(null);
  const others = all.filter((x) => x.id !== c.id);
  const targets = others.filter((x) => !x.archived).length ? others.filter((x) => !x.archived) : others;
  const [target, setTarget] = useState('');

  const onDelete = async () => {
    if (!others.length) return showToast(uk.templates.lastCategory);
    const u = await categoryUsage(c.id);
    if (u.activities || u.templates) {
      setTarget(targets[0]?.id ?? '');
      setUsage(u);
      return;
    }
    setConfirmDelete(true);
  };

  const onReassign = async () => {
    try {
      await reassignAndDeleteCategory(c.id, target);
      setUsage(null);
      showToast(uk.templates.deleted);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <li className={`flex flex-col gap-2 rounded-xl bg-card p-3 shadow-sm ${c.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={c.color}
          onChange={(e) => updateCategory(c.id, { color: e.target.value })}
          aria-label={uk.templates.color}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
        <TextField
          value={c.name}
          onSave={(name) => updateCategory(c.id, { name })}
          aria-label={uk.templates.categoryName}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 font-medium"
        />
        <IconButton label={`${uk.common.more}: ${c.name}`} onClick={() => setMenu(true)} className="-mr-1">⋯</IconButton>
      </div>
      <select
        value={c.kind}
        onChange={(e) => updateCategory(c.id, { kind: e.target.value as CategoryKind })}
        aria-label={uk.templates.kind}
        className="field-select w-full"
      >
        {KINDS.map((k) => <option key={k} value={k}>{uk.kinds[k]}</option>)}
      </select>

      <ActionSheet
        open={menu}
        title={c.name}
        onClose={() => setMenu(false)}
        actions={[
          {
            label: c.archived ? uk.templates.restore : uk.templates.archive,
            onClick: () => updateCategory(c.id, { archived: !c.archived }),
          },
          { label: uk.templates.delete, destructive: true, onClick: onDelete },
        ]}
      />
      <ConfirmSheet
        open={confirmDelete}
        title={uk.templates.deleteCategoryConfirm(c.name)}
        confirmLabel={uk.templates.delete}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteCategory(c.id);
          showToast(uk.templates.deleted);
        }}
      />
      <Sheet open={!!usage} onClose={() => setUsage(null)} title={uk.templates.deleteCategoryConfirm(c.name)}>
        {usage && <p className="text-ink-soft">{uk.templates.inUse(usage.activities, usage.templates)}</p>}
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          {uk.templates.moveTo}
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="field-select w-full">
            {targets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <div className="mt-1 flex flex-col gap-2">
          <button type="button" className="btn-solid btn-danger w-full" disabled={!target} onClick={onReassign}>
            {uk.templates.moveAndDelete}
          </button>
          {!c.archived && (
            <button
              type="button"
              className="btn-outline w-full"
              onClick={() => {
                updateCategory(c.id, { archived: true });
                setUsage(null);
              }}
            >
              {uk.templates.archiveInstead}
            </button>
          )}
          <button type="button" className="btn-ghost w-full" onClick={() => setUsage(null)}>
            {uk.common.cancel}
          </button>
        </div>
      </Sheet>
    </li>
  );
}

/** Дні повтору: кружки 40×40 із зоною тапу 44×44 (7 × 44 = 308 px — вміщається в картку на 375 px). */
export function WeekdayToggles({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex" role="group" aria-label={uk.templates.repeat}>
      {uk.weekdaysShort.map((d, i) => {
        const wd = i + 1;
        const on = value.includes(wd);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={uk.weekdaysLong[i]}
            onClick={() => onChange(on ? value.filter((x) => x !== wd) : [...value, wd].sort())}
            className="group grid h-11 w-11 place-items-center rounded-full"
          >
            <span
              className={`grid h-10 w-10 place-items-center rounded-full text-sm transition ${
                on ? 'bg-ink font-medium text-paper' : 'bg-ink/5 text-ink-soft group-active:bg-ink/15'
              }`}
            >
              {d}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TemplateRow({ t, categories, autoFocus }: { t: ActivityTemplate; categories: Category[]; autoFocus: boolean }) {
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const weekdays = t.recurrence?.weekdays ?? [];
  const setWeekdays = (wds: number[]) =>
    updateTemplate(t.id, {
      recurrence: wds.length ? { weekdays: wds, startDate: t.recurrence?.startDate ?? today() } : undefined,
    });
  return (
    <li className={`flex flex-col gap-3 rounded-xl bg-card p-3 shadow-sm ${t.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <TextField
          value={t.title}
          onSave={(title) => updateTemplate(t.id, { title })}
          aria-label={uk.templates.templateName}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 font-medium"
        />
        <IconButton label={`${uk.common.more}: ${t.title}`} onClick={() => setMenu(true)} className="-mr-1">⋯</IconButton>
      </div>
      <select
        value={t.categoryId}
        onChange={(e) => updateTemplate(t.id, { categoryId: e.target.value })}
        aria-label={uk.templates.category}
        className="field-select w-full"
      >
        {categories.filter((c) => !c.archived || c.id === t.categoryId).map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <SizePicker exact minutes={t.defaultMinutes} onChange={(m) => updateTemplate(t.id, { defaultMinutes: m })} />
      <div className="flex flex-col gap-1">
        <span className="text-sm text-ink-soft">
          {uk.templates.repeat}
          {!weekdays.length && <span> · {uk.templates.noRepeat}</span>}
        </span>
        <WeekdayToggles value={weekdays} onChange={setWeekdays} />
      </div>

      <ActionSheet
        open={menu}
        title={t.title}
        onClose={() => setMenu(false)}
        actions={[
          {
            label: t.archived ? uk.templates.restore : uk.templates.archive,
            onClick: () => updateTemplate(t.id, { archived: !t.archived }),
          },
          { label: uk.templates.delete, destructive: true, onClick: () => setConfirmDelete(true) },
        ]}
      />
      <ConfirmSheet
        open={confirmDelete}
        title={uk.templates.deleteTemplateTitle(t.title)}
        message={uk.templates.deleteTemplateHint}
        confirmLabel={uk.templates.delete}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteTemplate(t.id);
        }}
      />
    </li>
  );
}
