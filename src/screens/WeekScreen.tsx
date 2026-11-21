import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { useWeek, type DayView } from '../state/useWeek';
import { useUi } from '../state/uiStore';
import { DRAG_QUERY, MD_QUERY, useMediaQuery } from '../state/useMediaQuery';
import { BowlSvg } from '../components/BowlSvg';
import { copyWeek, moveActivity } from '../data/repos/activities';
import { addDaysStr, today, weekStartOf } from '../domain/dates';
import { formatHours } from '../domain/format';
import { liveActivities } from '../domain/stats';
import type { Activity, Category } from '../domain/types';
import { uk } from '../i18n/uk';
import { IconButton, ScreenHeader, toLayers, weekRange, weekdayShort } from './shared';
import { WeekBanners } from './WeekBanners';

function dayLabel(d: DayView) {
  const { stats } = d;
  return `${weekdayShort(d.date)} ${Number(d.date.slice(8))}: ${formatHours(stats.total)} з ${formatHours(stats.capacity)}`;
}

export function WeekScreen() {
  const { weekStart, setWeek, openDay, showToast } = useUi();
  const { week, catMap } = useWeek(weekStart);
  const desktop = useMediaQuery(MD_QUERY);
  const t = today();
  const isCurrent = weekStartOf(t) === weekStart;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <ScreenHeader>
        <IconButton label={uk.week.prev} onClick={() => setWeek(addDaysStr(weekStart, -7))} className="-ml-3 md:ml-0">‹</IconButton>
        <h1 className="min-w-0 flex-1 truncate text-center font-semibold md:flex-none md:min-w-32 md:font-medium">
          {weekRange(weekStart)}
        </h1>
        <IconButton label={uk.week.next} onClick={() => setWeek(addDaysStr(weekStart, 7))}>›</IconButton>
        <button
          type="button"
          onClick={() => setWeek(weekStartOf(t))}
          className={`btn-ghost -mr-3 md:mr-0 ${isCurrent ? 'invisible' : ''}`}
          aria-hidden={isCurrent || undefined}
          tabIndex={isCurrent ? -1 : undefined}
        >
          {uk.week.today}
        </button>
      </ScreenHeader>

      <div>
        <div className="text-sm text-ink-soft">{uk.week.selfTotal}</div>
        <div className="text-4xl font-semibold tabular-nums text-self">
          {week ? formatHours(week.stats.selfMinutes) : '…'}
        </div>
        {week && week.stats.overflowDays > 0 && (
          <div className="text-sm text-ink-soft">{uk.week.overflowDays(week.stats.overflowDays)}</div>
        )}
      </div>

      <WeekBanners />

      {week && (desktop
        ? <DesktopWeek days={week.days} catMap={catMap} today={t} onOpen={openDay} />
        : <PhoneWeek days={week.days} catMap={catMap} today={t} onOpen={openDay} />)}

      <button
        type="button"
        className="btn-outline w-full md:w-auto md:self-end"
        onClick={async () => showToast(uk.week.copied(await copyWeek(addDaysStr(weekStart, -7), weekStart)))}
      >
        {uk.week.copyLast}
      </button>
    </div>
  );
}

interface WeekProps {
  days: DayView[];
  catMap: Map<string, Category>;
  today: string;
  onOpen: (date: string) => void;
}

/** Телефон: усі 7 чаш в одному ряду + список днів. Без горизонтального скролу і drag & drop. */
function PhoneWeek({ days, catMap, today: t, onOpen }: WeekProps) {
  return (
    <>
      {/* gap-1 на 375 px: (343 − 6×4) / 7 ≈ 45,6 px — колонка лишається ≥ 44 px */}
      <div className="grid grid-cols-7 gap-1 min-[400px]:gap-1.5">
        {days.map((d) => {
          const isToday = d.date === t;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onOpen(d.date)}
              aria-label={dayLabel(d)}
              className={`flex min-h-16 min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 pt-1 pb-1.5 transition active:bg-ink/10 ${
                isToday ? 'bg-card shadow-sm' : ''
              }`}
            >
              <span className={`text-xs leading-tight ${isToday ? 'font-semibold' : 'text-ink-soft'}`}>
                {weekdayShort(d.date)}
              </span>
              <BowlSvg mini stats={d.stats} layers={toLayers(d.layers, catMap)} className="w-full" />
              <span className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-self' : 'bg-transparent'}`} aria-hidden />
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col divide-y divide-ink/10 rounded-2xl bg-card shadow-sm">
        {days.map((d) => (
          <li key={d.date}>
            <DayListRow day={d} catMap={catMap} isToday={d.date === t} onOpen={() => onOpen(d.date)} />
          </li>
        ))}
      </ul>
    </>
  );
}

function DayListRow({ day, catMap, isToday, onOpen }: {
  day: DayView; catMap: Map<string, Category>; isToday: boolean; onOpen: () => void;
}) {
  const { stats } = day;
  const live = liveActivities(day.layers);
  const scale = Math.max(stats.capacity, stats.total, 1);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={dayLabel(day)}
      className="flex min-h-14 w-full items-center gap-3 px-3 text-left transition active:bg-ink/5"
    >
      <span className="w-12 shrink-0 leading-tight">
        <span className={`block text-sm ${isToday ? 'font-semibold' : ''}`}>{weekdayShort(day.date)}</span>
        <span className="block text-xs tabular-nums text-ink-soft">{Number(day.date.slice(8))}</span>
      </span>
      <span className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/5" aria-hidden>
        {live.map((a) => (
          <span
            key={a.id}
            className="h-full"
            style={{ width: `${(a.minutes / scale) * 100}%`, background: catMap.get(a.categoryId)?.color ?? '#999' }}
          />
        ))}
      </span>
      <span
        className={`w-24 shrink-0 text-right text-sm tabular-nums ${stats.overflowMinutes > 0 ? 'font-medium text-rose-700 dark:text-rose-400' : 'text-ink-soft'}`}
      >
        {stats.overflowMinutes > 0
          ? uk.week.overShort(formatHours(stats.overflowMinutes))
          : uk.week.freeShort(formatHours(stats.freeMinutes))}
      </span>
      <span className="text-ink-soft" aria-hidden>›</span>
    </button>
  );
}

/** Десктоп: 7 колонок зі справами; перетягування — лише з точним вказівником. */
function DesktopWeek({ days, catMap, today: t, onOpen }: WeekProps) {
  const canDrag = useMediaQuery(DRAG_QUERY);
  const [dragged, setDragged] = useState<Activity | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (e: DragEndEvent) => {
    setDragged(null);
    const a = e.active.data.current?.activity as Activity | undefined;
    const to = e.over?.id as string | undefined;
    if (a && to && to !== a.date) moveActivity(a, to);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragged((e.active.data.current?.activity as Activity) ?? null)}
        onDragCancel={() => setDragged(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <DayColumn
              key={d.date} day={d} catMap={catMap} isToday={d.date === t} canDrag={canDrag} onOpen={() => onOpen(d.date)}
            />
          ))}
        </div>
        <DragOverlay>
          {dragged && <Pill activity={dragged} color={catMap.get(dragged.categoryId)?.color} lifted />}
        </DragOverlay>
      </DndContext>
      {canDrag && <p className="text-xs text-ink-soft">{uk.week.dragHint}</p>}
    </>
  );
}

function DayColumn({
  day, catMap, isToday, canDrag, onOpen,
}: { day: DayView; catMap: Map<string, Category>; isToday: boolean; canDrag: boolean; onOpen: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date });
  const { stats } = day;
  return (
    <section
      ref={setNodeRef}
      className={`flex min-w-0 flex-col gap-1 rounded-2xl p-2 transition ${
        isOver ? 'bg-self/10 ring-2 ring-self/40' : isToday ? 'bg-card shadow-sm' : ''
      }`}
    >
      <button type="button" onClick={onOpen} className="flex flex-col items-center rounded-xl focus-visible:outline-2" aria-label={dayLabel(day)}>
        <div className={`text-sm ${isToday ? 'font-semibold' : 'text-ink-soft'}`}>
          {weekdayShort(day.date)} <span className="tabular-nums">{Number(day.date.slice(8))}</span>
        </div>
        <BowlSvg stats={stats} layers={toLayers(day.layers, catMap)} className="w-full max-w-36" />
        <div className="text-xs tabular-nums text-ink-soft">
          {stats.overflowMinutes > 0
            ? uk.bowl.overflow(formatHours(stats.overflowMinutes))
            : uk.bowl.free(formatHours(stats.freeMinutes))}
        </div>
      </button>
      <ul className="flex flex-col gap-1">
        {[...day.layers].reverse().map((a) =>
          canDrag ? (
            <DraggablePill key={a.id} activity={a} color={catMap.get(a.categoryId)?.color} />
          ) : (
            <li key={a.id}><Pill activity={a} color={catMap.get(a.categoryId)?.color} /></li>
          ),
        )}
      </ul>
    </section>
  );
}

function DraggablePill({ activity, color }: { activity: Activity; color?: string }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: activity.id,
    data: { activity },
  });
  return (
    <li ref={setNodeRef} {...listeners} {...attributes} className={`no-callout ${isDragging ? 'opacity-30' : ''}`}>
      <Pill activity={activity} color={color} draggable />
    </li>
  );
}

function Pill({ activity, color, lifted, draggable }: { activity: Activity; color?: string; lifted?: boolean; draggable?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${draggable || lifted ? 'cursor-grab' : ''} ${lifted ? 'bg-card shadow-lg' : 'hover:bg-ink/5'}`}
      title={`${activity.title} · ${formatHours(activity.minutes)}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="truncate">{activity.title}</span>
      <span className="ml-auto shrink-0 tabular-nums text-ink-soft">{formatHours(activity.minutes)}</span>
    </div>
  );
}
