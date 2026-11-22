import { create } from 'zustand';
import { today, weekStartOf, type DateStr } from '../domain/dates';

export type Screen = 'week' | 'day' | 'templates' | 'summary' | 'settings';

interface UiState {
  screen: Screen;
  weekStart: DateStr;
  date: DateStr;
  toast?: string;
  /** розгорнуті групи шаблонів на екрані дня (id категорій) — живуть між днями до перезавантаження */
  openTemplateGroups: string[];
  go: (screen: Screen) => void;
  openDay: (date: DateStr) => void;
  setWeek: (weekStart: DateStr) => void;
  showToast: (msg: string) => void;
  toggleTemplateGroup: (categoryId: string) => void;
}

/** Хеш виду #/week/2026-11-23 або #/day/2026-11-25 — щоб працювала кнопка «назад». */
function parseHash(): Pick<UiState, 'screen' | 'weekStart' | 'date'> {
  const [, screen = 'week', date] = location.hash.split('/');
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today();
  const s = (['week', 'day', 'templates', 'summary', 'settings'] as const).find((x) => x === screen) ?? 'week';
  return { screen: s, date: d, weekStart: weekStartOf(d) };
}

function writeHash(s: Pick<UiState, 'screen' | 'weekStart' | 'date'>) {
  const arg = s.screen === 'day' ? `/${s.date}` : s.screen === 'week' ? `/${s.weekStart}` : '';
  const next = `#/${s.screen}${arg}`;
  if (location.hash !== next) location.hash = next;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set, get) => ({
  ...parseHash(),
  openTemplateGroups: [],
  go: (screen) => {
    set({ screen });
    writeHash(get());
  },
  openDay: (date) => {
    set({ screen: 'day', date, weekStart: weekStartOf(date) });
    writeHash(get());
  },
  setWeek: (weekStart) => {
    set({ weekStart, date: weekStart });
    writeHash(get());
  },
  showToast: (toast) => {
    set({ toast });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: undefined }), 2500);
  },
  toggleTemplateGroup: (id) => {
    const cur = get().openTemplateGroups;
    set({ openTemplateGroups: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => useUi.setState(parseHash()));
}
