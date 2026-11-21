import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Нижній лист на телефоні, діалог по центру з `md`. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center pl-[var(--sal)] pr-[var(--sar)] md:items-center md:p-4">
      <div className="sheet-backdrop absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="sheet-panel relative flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-card px-4 pt-3 pb-[calc(16px+var(--sab))] shadow-xl outline-none md:rounded-3xl md:pb-4"
      >
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-ink/15 md:hidden" aria-hidden />
        {title && <h2 id={titleId} className="text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
