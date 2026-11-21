import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, updateSettings } from '../data/repos/settings';
import { importData, parseBackup, saveBackup, type Backup } from '../data/backup';
import { storageStatus, type StorageStatus } from '../data/persistence';
import { useBackupSnapshot } from '../state/useBackupSnapshot';
import { useUi } from '../state/uiStore';
import { NumberField } from '../components/NumberField';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { uk } from '../i18n/uk';
import { ScreenHeader } from './shared';

export function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), []);
  const snapshot = useBackupSnapshot();
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = useUi((s) => s.showToast);
  const [storage, setStorage] = useState<StorageStatus>();
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  useEffect(() => {
    storageStatus().then(setStorage).catch(() => {});
  }, []);

  const header = (
    <ScreenHeader>
      <h1 className="text-lg font-semibold md:sr-only">{uk.settings.title}</h1>
    </ScreenHeader>
  );
  if (!settings) return header;

  const onPick = async (file: File) => {
    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  const onImport = async () => {
    const b = pendingImport;
    setPendingImport(null);
    if (!b) return;
    try {
      await importData(b);
      showToast(uk.settings.imported);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4 md:gap-6">
      {header}
      <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm">
        <label htmlFor="defcap" className="font-medium">{uk.settings.capacity}</label>
        <p className="text-sm text-ink-soft">{uk.settings.capacityHint}</p>
        <NumberField
          id="defcap"
          label={uk.settings.capacity}
          value={settings.defaultCapacityMinutes / 60}
          onChange={(h) => updateSettings({ defaultCapacityMinutes: Math.round(h * 60) })}
          min={1}
          max={24}
          step={0.5}
          unit="год"
        />
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-medium">{uk.settings.backup}</h2>
        <p className="text-sm text-ink-soft">{uk.settings.privacy}</p>
        <p className="mt-2 text-sm">
          {settings.lastBackupAt ? uk.settings.lastBackup(formatDateTime(settings.lastBackupAt)) : uk.settings.noBackup}
        </p>
        <p className="text-xs text-ink-soft">{uk.settings.backupTip}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-solid w-full text-base sm:w-auto"
            onClick={() => saveBackup(snapshot, uk.settings.shareTitle).catch((e) => showToast(String(e)))}
          >
            {uk.settings.export}
          </button>
          <button type="button" className="btn-outline w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
            {uk.settings.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,public.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
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

      <button type="button" className="btn-outline w-full sm:w-auto sm:self-start" onClick={() => updateSettings({ onboardedAt: undefined })}>
        {uk.settings.onboarding}
      </button>

      <ConfirmSheet
        open={!!pendingImport}
        title={uk.settings.importTitle}
        message={uk.settings.importConfirm}
        confirmLabel={uk.settings.importAction}
        destructive
        onCancel={() => setPendingImport(null)}
        onConfirm={onImport}
      />
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
