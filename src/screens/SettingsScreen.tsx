import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, updateSettings } from '../data/repos/settings';
import { importData, parseBackup, saveBackup } from '../data/backup';
import { storageStatus, type StorageStatus } from '../data/persistence';
import { useUi } from '../state/uiStore';
import { uk } from '../i18n/uk';

export function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = useUi((s) => s.showToast);
  const [storage, setStorage] = useState<StorageStatus>();
  useEffect(() => {
    storageStatus().then(setStorage).catch(() => {});
  }, []);
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
        <p className="mt-2 text-sm">
          {settings.lastBackupAt ? uk.settings.lastBackup(formatDateTime(settings.lastBackupAt)) : uk.settings.noBackup}
        </p>
        <p className="text-xs text-ink-soft">{uk.settings.backupTip}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-solid" onClick={() => saveBackup()}>
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

      <section className="rounded-2xl bg-card p-4 text-sm shadow-sm">
        <p>
          {uk.settings.storage}:{' '}
          {storage?.persisted ? uk.settings.storagePersisted : uk.settings.storageBestEffort}
          {storage?.usage !== undefined && (
            <span className="text-ink-soft"> · {uk.settings.storageUsed(formatBytes(storage.usage))}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-soft">{uk.settings.version(__APP_VERSION__)}</p>
      </section>

      <button type="button" className="btn-ghost self-start" onClick={() => updateSettings({ onboardedAt: undefined })}>
        {uk.settings.onboarding}
      </button>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} КБ`;
  return `${(n / 1024 ** 2).toFixed(1)} МБ`;
}
