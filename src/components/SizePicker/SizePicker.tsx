import { SIZES, SIZE_MINUTES, sizeOf } from '../../domain/types';
import { formatHours } from '../../domain/format';
import { uk } from '../../i18n/uk';
import { NumberField } from '../NumberField';

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
  /** показати поле для точних хвилин */
  exact?: boolean;
  /**
   * default — кнопки з підписом «S · 30 хв» на всю ширину;
   * touch — 4 квадрати 36×36 із зоною тапу 44×44 для згорнутого рядка справи.
   */
  variant?: 'default' | 'touch';
}

export function SizePicker({ minutes, onChange, exact, variant = 'default' }: Props) {
  const current = sizeOf(minutes);
  const picker = variant === 'touch' ? (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={uk.day.size}>
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={current === s}
          aria-label={`${s} · ${formatHours(SIZE_MINUTES[s])}`}
          onClick={() => onChange(SIZE_MINUTES[s])}
          className="group grid h-11 w-11 place-items-center rounded-lg"
        >
          <span
            className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold tabular-nums transition ${
              current === s ? 'bg-ink text-paper' : 'bg-ink/5 text-ink-soft group-active:bg-ink/15'
            }`}
          >
            {s}
          </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="grid w-full grid-cols-4 gap-1.5" role="group" aria-label={uk.day.size}>
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={current === s}
          aria-label={`${s} · ${formatHours(SIZE_MINUTES[s])}`}
          onClick={() => onChange(SIZE_MINUTES[s])}
          className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-lg px-1 leading-tight tabular-nums transition ${
            current === s ? 'bg-ink text-paper' : 'bg-ink/5 text-ink-soft hover:bg-ink/10 active:bg-ink/15'
          }`}
        >
          <span className="text-sm font-semibold">{s}</span>
          <span className={`text-xs whitespace-nowrap ${current === s ? 'opacity-80' : 'opacity-70'}`}>{formatHours(SIZE_MINUTES[s])}</span>
        </button>
      ))}
    </div>
  );

  if (!exact) return picker;
  return (
    <div className="flex flex-col gap-2">
      {picker}
      <NumberField
        label={uk.day.exactMinutes}
        mode="numeric"
        value={minutes}
        onChange={(m) => onChange(m)}
        min={5}
        max={1440}
        step={15}
        unit={uk.day.minutes}
      />
    </div>
  );
}
