import { SIZES, SIZE_MINUTES, sizeOf } from '../../domain/types';
import { uk } from '../../i18n/uk';

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
  /** показати поле для точних хвилин */
  exact?: boolean;
  compact?: boolean;
}

export function SizePicker({ minutes, onChange, exact, compact }: Props) {
  const current = sizeOf(minutes);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Розмір">
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={current === s}
          title={`${SIZE_MINUTES[s]} ${uk.day.minutes}`}
          onClick={() => onChange(SIZE_MINUTES[s])}
          className={`rounded-md font-medium tabular-nums transition ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} ${
            current === s ? 'bg-ink text-paper' : 'bg-ink/5 text-ink-soft hover:bg-ink/10'
          }`}
        >
          {s}
        </button>
      ))}
      {exact && (
        <label className="ml-1 flex items-center gap-1 text-sm text-ink-soft">
          <input
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v > 0) onChange(Math.round(v));
            }}
            className="w-16 rounded-md border border-ink/15 bg-transparent px-1.5 py-0.5 tabular-nums"
          />
          {uk.day.minutes}
        </label>
      )}
    </div>
  );
}
