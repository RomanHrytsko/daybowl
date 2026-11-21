import type { Screen } from '../../state/uiStore';
import { NavIcon } from './icons';

export type NavId = Exclude<Screen, 'day'>;

interface Props {
  items: { id: NavId; label: string }[];
  active: NavId;
  onGo: (id: NavId) => void;
}

/** Нижня таб-панель для телефону: 56 px + смужка домівки. */
export function TabBar({ items, active, onGo }: Props) {
  return (
    <nav
      aria-label="Розділи"
      className="tabbar fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/90 pr-[var(--sar)] pb-[var(--sab)] pl-[var(--sal)] backdrop-blur md:hidden"
    >
      <ul className="grid h-[var(--tabbar-h)] grid-cols-4">
        {items.map((n) => {
          const on = active === n.id;
          return (
            <li key={n.id} className="flex">
              <button
                type="button"
                onClick={() => onGo(n.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition ${on ? 'text-ink' : 'text-ink-soft'}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full ${on ? 'bg-ink/10' : ''}`}>
                  <NavIcon id={n.id} />
                </span>
                <span className={`text-[11px] leading-none ${on ? 'font-semibold' : ''}`}>{n.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
