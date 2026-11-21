import { useState } from 'react';
import { useCatalog } from '../state/useWeek';
import { updateCategory } from '../data/repos/categories';
import { createTemplate, updateTemplate } from '../data/repos/templates';
import { updateSettings } from '../data/repos/settings';
import { SizePicker } from '../components/SizePicker';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { IconButton } from './shared';
import { WeekdayToggles } from './TemplatesScreen';
import { nowIso, today, weekStartOf } from '../domain/dates';
import { uk } from '../i18n/uk';

interface RecRow {
  templateId: string;
  minutes: number;
  weekdays: number[];
}

/** Перше налаштування: категорії, об'єм дня, 2–3 повтори. */
export function OnboardingScreen() {
  const { categories, templates, settings } = useCatalog();
  const [hours, setHours] = useState<number | null>(null);
  const [rows, setRows] = useState<RecRow[] | null>(null);
  if (!categories || !templates || !settings) return null;

  const active = templates.filter((t) => !t.archived);
  const byTitle = (s: string) => active.find((t) => t.title === s);
  const recRows: RecRow[] = rows ?? [
    ...(byTitle('Робота') ? [{ templateId: byTitle('Робота')!.id, minutes: 480, weekdays: [1, 2, 3, 4, 5] }] : []),
    ...(byTitle('Тренування') ? [{ templateId: byTitle('Тренування')!.id, minutes: 60, weekdays: [2, 4] }] : []),
  ];
  const capHours = hours ?? settings.defaultCapacityMinutes / 60;

  const finish = async () => {
    // повтори діють з початку поточного тижня, щоб одразу заповнити його
    const startDate = weekStartOf(today());
    for (const r of recRows) {
      if (!r.weekdays.length || !r.templateId) continue;
      const t = templates.find((x) => x.id === r.templateId);
      if (t?.recurrence) {
        await createTemplate({
          title: t.title, categoryId: t.categoryId, defaultMinutes: r.minutes,
          recurrence: { weekdays: r.weekdays, startDate },
        });
      } else {
        await updateTemplate(r.templateId, {
          defaultMinutes: r.minutes, recurrence: { weekdays: r.weekdays, startDate },
        });
      }
    }
    await updateSettings({ defaultCapacityMinutes: Math.round(capHours * 60), onboardedAt: nowIso() });
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-6">
      <header>
        <h1 className="text-2xl font-semibold">{uk.onboarding.title}</h1>
        <p className="mt-1 text-ink-soft">{uk.onboarding.intro}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{uk.onboarding.step1}</h2>
        <p className="text-sm text-ink-soft">{uk.onboarding.step1Hint}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.filter((c) => !c.archived).map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
              <TextField
                value={c.name}
                onSave={(name) => updateCategory(c.id, { name })}
                aria-label={uk.templates.categoryName}
                className="min-w-0 flex-1"
              />
              <span className={`text-xs ${c.kind === 'self' ? 'text-self' : 'text-ink-soft'}`}>{uk.kinds[c.kind]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{uk.onboarding.step2}</h2>
        <p className="text-sm text-ink-soft">{uk.onboarding.step2Hint}</p>
        <NumberField
          label={uk.onboarding.step2}
          value={capHours}
          onChange={setHours}
          min={1}
          max={24}
          step={0.5}
          unit="год"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{uk.onboarding.step3}</h2>
        <p className="text-sm text-ink-soft">{uk.onboarding.step3Hint}</p>
        <ul className="flex flex-col gap-2">
          {recRows.map((r, i) => {
            const set = (patch: Partial<RecRow>) =>
              setRows(recRows.map((x, k) => (k === i ? { ...x, ...patch } : x)));
            return (
              <li key={i} className="flex flex-col gap-3 rounded-xl bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                <select
                  value={r.templateId}
                  onChange={(e) => {
                    const t = active.find((x) => x.id === e.target.value);
                    set({ templateId: e.target.value, minutes: t?.defaultMinutes ?? r.minutes });
                  }}
                  aria-label={uk.templates.templateName}
                  className="field-select min-w-0 flex-1"
                >
                  {active.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <IconButton label={uk.onboarding.remove} onClick={() => setRows(recRows.filter((_, k) => k !== i))} className="-mr-1">
                  ✕
                </IconButton>
                </div>
                <SizePicker exact minutes={r.minutes} onChange={(m) => set({ minutes: m })} />
                <WeekdayToggles value={r.weekdays} onChange={(w) => set({ weekdays: w })} />
              </li>
            );
          })}
        </ul>
        {recRows.length < 5 && active[0] && (
          <button
            type="button"
            className="btn-ghost self-start"
            onClick={() => setRows([...recRows, { templateId: active[0].id, minutes: active[0].defaultMinutes, weekdays: [] }])}
          >
            + {uk.onboarding.addRow}
          </button>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 bg-paper/90 px-4 pt-3 pb-[calc(var(--sab)+12px)] backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pb-8 md:backdrop-blur-none">
        <button type="button" className="btn-solid w-full px-5 text-base md:w-auto" onClick={finish}>
          {uk.onboarding.done}
        </button>
      </div>
    </div>
  );
}
