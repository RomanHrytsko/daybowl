import { useId, useState } from 'react';
import { useDebouncedSave } from '../../state/useDebouncedSave';
import { uk } from '../../i18n/uk';
import { formatDecimal, parseDecimal } from './parse';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  /** крок кнопок − / + */
  step: number;
  /** decimal — години (з комою), numeric — цілі хвилини */
  mode?: 'decimal' | 'numeric';
  unit?: string;
  label: string;
  id?: string;
  /** показати кнопки − / + */
  stepper?: boolean;
  className?: string;
}

/**
 * Числове поле без `type="number"`: iOS з українською локаллю дає кому,
 * тож парсимо самі й показуємо помилку замість тихого ігнорування.
 */
export function NumberField({
  value, onChange, min, max, step, mode = 'decimal', unit, label, id, stepper = true, className = '',
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-err`;
  const [text, setText] = useState(() => formatDecimal(value));
  const [focused, setFocused] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (!focused) setText(formatDecimal(value));
  }

  const toValid = (t: string): number | null => {
    const n = parseDecimal(t);
    if (n === null) return null;
    const v = mode === 'numeric' ? Math.round(n) : n;
    return v >= min && v <= max ? v : null;
  };
  const parsed = toValid(text);
  const invalid = parsed === null && (!focused || text.trim() !== '');

  // без таймера: проміжне «1» на шляху до «16» не має потрапляти в базу
  const flush = useDebouncedSave(text, (t) => {
    const v = toValid(t);
    if (v !== null && v !== value) onChange(v);
  }, null);

  const stepBy = (dir: 1 | -1) => {
    const base = parsed ?? value;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) * 100) / 100));
    setText(formatDecimal(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        {stepper && (
          <StepButton label={`${uk.number.dec}: ${label}`} disabled={value <= min} onClick={() => stepBy(-1)}>−</StepButton>
        )}
        <input
          id={inputId}
          type="text"
          inputMode={mode}
          enterKeyHint="done"
          pattern={mode === 'numeric' ? '[0-9]*' : '[0-9]*[.,]?[0-9]*'}
          autoComplete="off"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errId : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            flush();
            if (parsed !== null) setText(formatDecimal(parsed));
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`field w-20 text-center font-semibold tabular-nums ${invalid ? 'border-rose-600 ring-1 ring-rose-600' : ''}`}
        />
        {stepper && (
          <StepButton label={`${uk.number.inc}: ${label}`} disabled={value >= max} onClick={() => stepBy(1)}>+</StepButton>
        )}
        {unit && <span className="text-sm text-ink-soft">{unit}</span>}
      </div>
      {invalid && (
        <p id={errId} role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {uk.number.invalid(formatDecimal(min), formatDecimal(max))}
        </p>
      )}
    </div>
  );
}

function StepButton({ label, onClick, disabled, children }: {
  label: string; onClick: () => void; disabled?: boolean; children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 text-xl text-ink transition hover:bg-ink/5 active:bg-ink/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
