import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { useWeek, type DayView } from '../state/useWeek';
import { useUi } from '../state/uiStore';
import { BowlSvg } from '../components/BowlSvg';
import { copyWeek, moveActivity } from '../data/repos/activities';
import { addDaysStr, today, weekStartOf } from '../domain/dates';
import { formatHours } from '../domain/format';
import type { Activity, Category } from '../domain/types';
import { uk } from '../i18n/uk';
import { IconButton, toLayers, weekRange, weekdayShort } from './shared';
import { WeekBanners } from './WeekBanners';

export function WeekScreen() {
  const { weekStart, setWeek, openDay, showToast } = useUi();
  const { week, catMap } = useWeek(weekStart);
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

  const t = today();
  const isCurrent = weekStartOf(t) === weekStart;

  return (
    <div className="flex flex-col gap-5">
      <WeekBanners />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-ink-soft">{uk.week.selfTotal}</div>
          <div className="text-4xl font-semibold tabular-nums text-self">
            {week ? formatHours(week.stats.selfMinutes) : '…'}
          </div>
          {week && week.stats.overflowDays > 0 && (
            <div className="text-sm text-ink-soft">{uk.week.overflowDays(week.stats.overflowDays)}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={uk.week.prev} onClick={() => setWeek(addDaysStr(weekStart, -7))}>‹</IconButton>
          <div className="min-w-32 text-center font-medium">{weekRange(weekStart)}</div>
          <IconButton label={uk.week.next} onClick={() => setWeek(addDaysStr(weekStart, 7))}>›</IconButton>
          {!isCurrent && (
            <button type="button" onClick={() => setWeek(weekStartOf(t))} className="btn-ghost ml-1">
              {uk.week.today}
            </button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragged((e.active.data.current?.activity as Activity) ?? null)}
        onDragCancel={() => setDragged(null)}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
          {week?.days.map((d) => (
            <DayColumn key={d.date} day={d} catMap={catMap} isToday={d.date === t} onOpen={() => openDay(d.date)} />
          ))}
        </div>
        <DragOverlay>
          {dragged && <Pill activity={dragged} color={catMap.get(dragged.categoryId)?.color} lifted />}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">{uk.week.dragHint}</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => showToast(uk.week.copied(await copyWeek(addDaysStr(weekStart, -7), weekStart)))}
        >
          {uk.week.copyLast}
        </button>
      </div>
    </div>
  );
}

function DayColumn({
  day, catMap, isToday, onOpen,
}: { day: DayView; catMap: Map<string, Category>; isToday: boolean; onOpen: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date });
  const { stats } = day;
  const label = `${weekdayShort(day.date)} ${day.date.slice(8)}: ${formatHours(stats.total)} з ${formatHours(stats.capacity)}`;
  return (
    <section
      ref={setNodeRef}
      className={`flex w-36 shrink-0 snap-start flex-col gap-1 rounded-2xl p-2 transition md:w-auto ${
        isOver ? 'bg-self/10 ring-2 ring-self/40' : isToday ? 'bg-card shadow-sm' : ''
      }`}
    >
      <button type="button" onClick={onOpen} className="flex flex-col items-center rounded-xl focus-visible:outline-2" aria-label={label}>
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
        {[...day.layers].reverse().map((a) => (
          <DraggablePill key={a.id} activity={a} color={catMap.get(a.categoryId)?.color} />
        ))}
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
    <li ref={setNodeRef} {...listeners} {...attributes} className={`touch-manipulation ${isDragging ? 'opacity-30' : ''}`}>
      <Pill activity={activity} color={color} />
    </li>
  );
}

function Pill({ activity, color, lifted }: { activity: Activity; color?: string; lifted?: boolean }) {
  return (
    <div
      className={`flex cursor-grab items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${lifted ? 'bg-card shadow-lg' : 'hover:bg-ink/5'}`}
      title={`${activity.title} · ${formatHours(activity.minutes)}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="truncate">{activity.title}</span>
      <span className="ml-auto shrink-0 tabular-nums text-ink-soft">{formatHours(activity.minutes)}</span>
    </div>
  );
}
