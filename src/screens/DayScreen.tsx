import { useState } from 'react';
import { useDay } from '../state/useDay';
import { useUi } from '../state/uiStore';
import { BowlSvg } from '../components/BowlSvg';
import { TemplateChips } from '../components/TemplateChips';
import { ActivityRow } from '../components/ActivityRow';
import { NumberField } from '../components/NumberField';
import { addActivity, addFromTemplate } from '../data/repos/activities';
import { setDayCapacity } from '../data/repos/dayConfigs';
import { addDaysStr } from '../domain/dates';
import { formatHours } from '../domain/format';
import { uk } from '../i18n/uk';
import { IconButton, ScreenHeader, Stat, dayMonth, toLayers, weekdayLong } from './shared';

export function DayScreen() {
  const { date, openDay, go } = useUi();
  const { day, categories, templates, catMap, settings } = useDay(date);
  const [expanded, setExpanded] = useState<string | null>(null);

  const header = (
    <ScreenHeader>
      <button type="button" onClick={() => go('week')} className="btn-ghost -ml-3 text-base">‹ {uk.day.back}</button>
      <div className="ml-auto flex items-center">
        <IconButton label={uk.day.prevDay} onClick={() => openDay(addDaysStr(date, -1))}>‹</IconButton>
        <h1 className="min-w-28 text-center leading-tight">
          <span className="block font-semibold first-letter:uppercase md:text-lg">{weekdayLong(date)}</span>
          <span className="block text-xs text-ink-soft md:text-sm">{dayMonth(date)}</span>
        </h1>
        <IconButton label={uk.day.nextDay} onClick={() => openDay(addDaysStr(date, 1))} className="-mr-3 md:mr-0">›</IconButton>
      </div>
    </ScreenHeader>
  );

  if (!day || !categories || !templates || !settings) return header;
  const { stats } = day;
  const listed = [...day.layers].reverse(); // верхній шар — першим

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {header}

      <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-6">
        <div className="flex flex-col items-center gap-2">
          <BowlSvg
            stats={stats}
            layers={toLayers(day.layers, catMap)}
            showFreeLabel
            className="w-full max-w-56 max-md:max-h-[34svh] md:max-w-80"
            label={`${formatHours(stats.total)} з ${formatHours(stats.capacity)}`}
          />
          {stats.overflowMinutes > 0 && (
            <p className="text-sm text-ink-soft">{uk.bowl.overflow(formatHours(stats.overflowMinutes))}</p>
          )}
          <div className="grid w-full grid-cols-2 gap-2">
            <Stat label={uk.day.free} value={formatHours(stats.freeMinutes)} />
            <Stat label={uk.day.self} value={formatHours(stats.selfMinutes)} accent />
            <CapacityStat
              minutes={stats.capacity}
              custom={day.customCapacity}
              onChange={(m) => setDayCapacity(date, m === settings.defaultCapacityMinutes ? undefined : m)}
              onReset={() => setDayCapacity(date, undefined)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TemplateChips
            templates={templates}
            categories={categories}
            onPick={(t) => addFromTemplate(date, t)}
            onCustom={(v) => addActivity({ date, ...v })}
          />
          {listed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink/20 p-4 text-sm text-ink-soft">{uk.day.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label={uk.day.list}>
              {listed.map((a, i) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  category={catMap.get(a.categoryId)}
                  categories={categories}
                  isTop={i === 0}
                  isBottom={i === listed.length - 1}
                  open={expanded === a.id}
                  onToggle={() => setExpanded((cur) => (cur === a.id ? null : a.id))}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CapacityStat({
  minutes, custom, onChange, onReset,
}: { minutes: number; custom: boolean; onChange: (m: number) => void; onReset: () => void }) {
  return (
    <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-card px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1">
        <label className="text-xs text-ink-soft" htmlFor="cap">{uk.day.capacity}</label>
        {custom && (
          <button type="button" onClick={onReset} className="btn-ghost -my-1 min-h-11 px-2">
            {uk.day.capacityReset}
          </button>
        )}
      </div>
      <NumberField
        id="cap"
        label={uk.day.capacity}
        value={minutes / 60}
        onChange={(h) => onChange(Math.round(h * 60))}
        min={0}
        max={24}
        step={0.5}
        unit="год"
      />
    </div>
  );
}
