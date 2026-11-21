import { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, updateSettings } from '../data/repos/settings';
import { downloadBackup, exportData, importData, parseBackup } from '../data/backup';
import { useUi } from '../state/uiStore';
import { uk } from '../i18n/uk';

export function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = useUi((s) => s.showToast);
  if (!settings) return null;

  const onImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      if (!confirm(uk.settings.importConfirm)) return;
      await importData(backup);
      showToast(uk.settings.imported);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <label htmlFor="defcap" className="font-medium">{uk.settings.capacity}</label>
        <p className="text-sm text-ink-soft">{uk.settings.capacityHint}</p>
        <input
          id="defcap"
          type="number"
          min={1}
          max={24}
          step={0.5}
          key={settings.defaultCapacityMinutes}
          defaultValue={settings.defaultCapacityMinutes / 60}
          onBlur={(e) => {
            const h = Number(e.target.value);
            if (h > 0 && h <= 24) updateSettings({ defaultCapacityMinutes: Math.round(h * 60) });
          }}
          className="mt-2 w-24 rounded-md border border-ink/15 bg-transparent px-2 py-1 text-lg tabular-nums"
        />
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-medium">{uk.settings.backup}</h2>
        <p className="text-sm text-ink-soft">{uk.settings.privacy}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-solid" onClick={async () => downloadBackup(await exportData())}>
            {uk.settings.export}
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            {uk.settings.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <button type="button" className="btn-ghost self-start" onClick={() => updateSettings({ onboardedAt: undefined })}>
        {uk.settings.onboarding}
      </button>
    </div>
  );
}
