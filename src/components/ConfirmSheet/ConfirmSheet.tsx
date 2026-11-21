import type { ReactNode } from 'react';
import { uk } from '../../i18n/uk';
import { Sheet } from './Sheet';

interface ConfirmProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Підтвердження замість `window.confirm()`: у стилі застосунку, без адреси сайту в заголовку. */
export function ConfirmSheet({ open, title, message, confirmLabel, destructive, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {message && <div className="text-ink-soft">{message}</div>}
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          className={`btn-solid w-full ${destructive ? 'btn-danger' : ''}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn-ghost w-full" onClick={onCancel}>
          {uk.common.cancel}
        </button>
      </div>
    </Sheet>
  );
}

export interface SheetAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

/** Меню «⋯»: список дій на повну ширину. Деструктивні — останніми, з відступом. */
export function ActionSheet({ open, title, actions, onClose }: {
  open: boolean; title?: string; actions: SheetAction[]; onClose: () => void;
}) {
  const safe = actions.filter((a) => !a.destructive);
  const danger = actions.filter((a) => a.destructive);
  const run = (a: SheetAction) => {
    onClose();
    a.onClick();
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-2">
        {safe.map((a) => (
          <button key={a.label} type="button" className="btn-outline w-full" onClick={() => run(a)}>{a.label}</button>
        ))}
      </div>
      {danger.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {danger.map((a) => (
            <button key={a.label} type="button" className="btn-outline btn-outline-danger w-full" onClick={() => run(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn-ghost mt-1 w-full" onClick={onClose}>{uk.common.cancel}</button>
    </Sheet>
  );
}
