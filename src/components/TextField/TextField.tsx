import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { useDebouncedSave } from '../../state/useDebouncedSave';

type Props = {
  value: string;
  /** отримує обрізаний непорожній текст, відмінний від поточного */
  onSave: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'>;

/**
 * Текстове поле, що зберігає саме: debounce 400 мс, на blur і при сховуванні сторінки.
 * Enter прибирає клавіатуру.
 */
export function TextField({ value, onSave, className = '', onBlur, onFocus, onKeyDown, autoFocus, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // autoFocus може стати true вже після монтування (рядок з'являється з live-запиту раніше за стан фокуса)
  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    ref.current.focus();
    ref.current.select();
  }, [autoFocus]);
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (!focused) setText(value);
  }

  const flush = useDebouncedSave(text, (t) => {
    const v = t.trim();
    if (v && v !== value) onSave(v);
  });

  return (
    <input
      type="text"
      enterKeyHint="done"
      autoCapitalize="sentences"
      autoCorrect="on"
      {...rest}
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        flush();
        if (!text.trim()) setText(value);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        onKeyDown?.(e);
      }}
      className={`field ${className}`}
    />
  );
}
