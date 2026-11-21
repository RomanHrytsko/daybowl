import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { seedIfEmpty } from './data/seed';
import { getSettings } from './data/repos/settings';
import { requestPersistence } from './data/persistence';
import { useUi } from './state/uiStore';
import { WeekScreen } from './screens/WeekScreen';
import { DayScreen } from './screens/DayScreen';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TabBar, type NavId } from './components/TabBar';
import { NavIcon } from './components/TabBar/icons';
import { uk } from './i18n/uk';

const NAV: { id: NavId; label: string }[] = [
  { id: 'week', label: uk.nav.week },
  { id: 'summary', label: uk.nav.summary },
  { id: 'templates', label: uk.nav.templates },
  { id: 'settings', label: uk.nav.settings },
];

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seedIfEmpty().then(() => {
      setReady(true);
      requestPersistence().catch(() => {});
    });
  }, []);
  const settings = useLiveQuery(() => (ready ? getSettings() : undefined), [ready]);
  const { screen, go, toast } = useUi();

  if (!settings) return null;
  if (!settings.onboardedAt) {
    return (
      <main className="px-4 pt-[var(--sat)]">
        <OnboardingScreen />
      </main>
    );
  }

  const active: NavId = screen === 'day' ? 'week' : screen;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <nav
        aria-label="Розділи"
        className="sticky top-0 z-20 hidden items-center gap-1 bg-paper/90 px-4 pt-[calc(var(--sat)+8px)] pb-2 backdrop-blur md:flex"
      >
        <span className="mr-auto font-semibold">{uk.appName}</span>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={active === n.id ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition ${
              active === n.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/5'
            }`}
          >
            <NavIcon id={n.id} />
            {n.label}
          </button>
        ))}
      </nav>
      <main className="flex-1 px-4 pb-[calc(var(--tabbar-h)+var(--sab)+16px)] md:pt-4 md:pb-10">
        {screen === 'week' && <WeekScreen />}
        {screen === 'day' && <DayScreen />}
        {screen === 'templates' && <TemplatesScreen />}
        {screen === 'summary' && <SummaryScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      <TabBar items={NAV} active={active} onGo={go} />
      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-[calc(var(--sab)+64px)] z-50 mx-auto w-fit max-w-[calc(100%-32px)] rounded-2xl bg-ink px-4 py-2.5 text-center text-sm text-balance text-paper shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
