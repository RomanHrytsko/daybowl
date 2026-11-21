import { useCallback, useEffect, useRef } from 'react';

/**
 * Зберігає значення з затримкою після останньої зміни, а також одразу —
 * на blur (через повернутий flush), при сховуванні сторінки (свайп додому на iOS
 * може не викликати blur) і при демонтажі компонента.
 * `delay: null` — без таймера: лише flush, сховування сторінки й демонтаж.
 */
export function useDebouncedSave<T>(value: T, save: (v: T) => void, delay: number | null = 400): () => void {
  const saveRef = useRef(save);
  saveRef.current = save;
  const pending = useRef<{ v: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const first = useRef(true);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) saveRef.current(p.v);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = { v: value };
    clearTimeout(timer.current);
    if (delay !== null) timer.current = setTimeout(flush, delay);
  }, [value, delay, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return flush;
}
