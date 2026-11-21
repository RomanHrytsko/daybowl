import { useState } from 'react';
import { useCatalog } from '../state/useWeek';
import {
  categoryUsage, createCategory, deleteCategory, reassignAndDeleteCategory, updateCategory, type CategoryUsage,
} from '../data/repos/categories';
import { createTemplate, deleteTemplate, updateTemplate } from '../data/repos/templates';
import { useUi } from '../state/uiStore';
import { SizePicker } from '../components/SizePicker';
import { today } from '../domain/dates';
import type { ActivityTemplate, Category, CategoryKind } from '../domain/types';
import { uk } from '../i18n/uk';

const KINDS: CategoryKind[] = ['obligation', 'self', 'neutral'];

export function TemplatesScreen() {
  const { categories, templates } = useCatalog();
  const [showArchived, setShowArchived] = useState(false);
  if (!categories || !templates) return null;
  const visibleCats = categories.filter((c) => showArchived || !c.archived);
  const visibleTpls = templates
    .filter((t) => showArchived || !t.archived)
    .sort((a, b) => a.title.localeCompare(b.title, 'uk'));

  return (
    <div className="flex flex-col gap-8">
      <label className="flex items-center gap-2 self-end text-sm text-ink-soft">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        {uk.templates.archived}
      </label>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{uk.templates.categories}</h2>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => createCategory({ name: uk.templates.newCategory, color: '#6B9AC4', kind: 'neutral' })}
          >
            + {uk.templates.newCategory}
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {visibleCats.map((c) => <CategoryRow key={c.id} c={c} all={categories} />)}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{uk.templates.templates}</h2>
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              createTemplate({
                title: uk.templates.newTemplate,
                categoryId: categories.find((c) => !c.archived)?.id ?? categories[0]?.id ?? '',
                defaultMinutes: 60,
              })
            }
          >
            + {uk.templates.newTemplate}
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {visibleTpls.map((t) => <TemplateRow key={t.id} t={t} categories={categories} />)}
        </ul>
      </section>
    </div>
  );
}

function CategoryRow({ c, all }: { c: Category; all: Category[] }) {
  const showToast = useUi((s) => s.showToast);
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
    if (!confirm(uk.templates.deleteCategoryConfirm(c.name))) return;
    await deleteCategory(c.id);
    showToast(uk.templates.deleted);
  };

  const onReassign = async () => {
    try {
      await reassignAndDeleteCategory(c.id, target);
      showToast(uk.templates.deleted);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <li className={`flex flex-col gap-2 rounded-xl bg-card px-3 py-2 shadow-sm ${c.archived ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
      <input
        type="color"
        value={c.color}
        onChange={(e) => updateCategory(c.id, { color: e.target.value })}
        aria-label="Колір"
        className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
      />
      <input
        defaultValue={c.name}
        onBlur={(e) => e.target.value.trim() && updateCategory(c.id, { name: e.target.value.trim() })}
        aria-label="Назва категорії"
        className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 font-medium"
      />
      <select
        value={c.kind}
        onChange={(e) => updateCategory(c.id, { kind: e.target.value as CategoryKind })}
        aria-label="Тип"
        className="rounded-md border border-ink/15 bg-transparent px-2 py-1 text-sm"
      >
        {KINDS.map((k) => <option key={k} value={k}>{uk.kinds[k]}</option>)}
      </select>
      <button type="button" className="btn-ghost text-sm" onClick={() => updateCategory(c.id, { archived: !c.archived })}>
        {c.archived ? uk.templates.restore : uk.templates.archive}
      </button>
      <button type="button" className="btn-ghost text-sm" onClick={onDelete} aria-label={`${uk.templates.delete} ${c.name}`}>
        {uk.templates.delete}
      </button>
      </div>
      {usage && (
        <div role="dialog" aria-label={uk.templates.deleteCategoryConfirm(c.name)} className="flex flex-wrap items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-sm">
          <span className="w-full">{uk.templates.inUse(usage.activities, usage.templates)}</span>
          {!c.archived && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                updateCategory(c.id, { archived: true });
                setUsage(null);
              }}
            >
              {uk.templates.archive}
            </button>
          )}
          <label className="flex items-center gap-1">
            {uk.templates.moveTo}
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-md border border-ink/15 bg-transparent px-2 py-1"
            >
              {targets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <button type="button" className="btn-solid" disabled={!target} onClick={onReassign}>
            {uk.templates.moveAndDelete}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setUsage(null)}>
            {uk.templates.cancel}
          </button>
        </div>
      )}
    </li>
  );
}

export function WeekdayToggles({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label={uk.templates.repeat}>
      {uk.weekdaysShort.map((d, i) => {
        const wd = i + 1;
        const on = value.includes(wd);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== wd) : [...value, wd].sort())}
            className={`h-7 w-7 rounded-full text-xs ${on ? 'bg-ink text-paper' : 'bg-ink/5 text-ink-soft'}`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function TemplateRow({ t, categories }: { t: ActivityTemplate; categories: Category[] }) {
  const weekdays = t.recurrence?.weekdays ?? [];
  const setWeekdays = (wds: number[]) =>
    updateTemplate(t.id, {
      recurrence: wds.length ? { weekdays: wds, startDate: t.recurrence?.startDate ?? today() } : undefined,
    });
  return (
    <li className={`flex flex-col gap-2 rounded-xl bg-card px-3 py-2 shadow-sm ${t.archived ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={t.title}
          onBlur={(e) => e.target.value.trim() && updateTemplate(t.id, { title: e.target.value.trim() })}
          aria-label="Назва шаблону"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 font-medium"
        />
        <select
          value={t.categoryId}
          onChange={(e) => updateTemplate(t.id, { categoryId: e.target.value })}
          aria-label="Категорія"
          className="rounded-md border border-ink/15 bg-transparent px-2 py-1 text-sm"
        >
          {categories.filter((c) => !c.archived || c.id === t.categoryId).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost text-sm" onClick={() => updateTemplate(t.id, { archived: !t.archived })}>
          {t.archived ? uk.templates.restore : uk.templates.archive}
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          aria-label={`${uk.templates.delete} ${t.title}`}
          onClick={() => confirm(uk.templates.deleteTemplateConfirm(t.title)) && deleteTemplate(t.id)}
        >
          {uk.templates.delete}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SizePicker exact compact minutes={t.defaultMinutes} onChange={(m) => updateTemplate(t.id, { defaultMinutes: m })} />
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          {uk.templates.repeat}
          <WeekdayToggles value={weekdays} onChange={setWeekdays} />
        </div>
      </div>
    </li>
  );
}
