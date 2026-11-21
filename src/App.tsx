import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { seedIfEmpty } from './data/seed';
import { getSettings } from './data/repos/settings';
import { requestPersistence } from './data/persistence';
import { useUi, type Screen } from './state/uiStore';
import { WeekScreen } from './screens/WeekScreen';
import { DayScreen } from './screens/DayScreen';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { uk } from './i18n/uk';

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'week', label: uk.nav.week, icon: '◡' },
  { id: 'summary', label: uk.nav.summary, icon: '▮' },
  { id: 'templates', label: uk.nav.templates, icon: '◍' },
  { id: 'settings', label: uk.nav.settings, icon: '⚙' },
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
      <main className="px-4">
        <OnboardingScreen />
      </main>
    );
  }

  const active = screen === 'day' ? 'week' : screen;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <nav className="sticky top-0 z-10 flex items-center gap-1 bg-paper/90 px-4 py-2 backdrop-blur">
        <span className="mr-auto font-semibold">{uk.appName}</span>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={active === n.id ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active === n.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/5'
            }`}
          >
            <span className="sm:hidden" aria-hidden>{n.icon}</span>
            <span className="max-sm:sr-only">{n.label}</span>
          </button>
        ))}
      </nav>
      <main className="flex-1 px-4 pb-10 pt-4">
        {screen === 'week' && <WeekScreen />}
        {screen === 'day' && <DayScreen />}
        {screen === 'templates' && <TemplatesScreen />}
        {screen === 'summary' && <SummaryScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
