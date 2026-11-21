import { useSyncExternalStore } from 'react';

export const MD_QUERY = '(min-width: 768px)';
export const DRAG_QUERY = '(min-width: 768px) and (pointer: fine)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia?.(query);
      m?.addEventListener('change', cb);
      return () => m?.removeEventListener('change', cb);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
