import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { getSettings, updateSettings } from '../data/repos/settings';
import { backupOverdueDays, saveBackup } from '../data/backup';
import { isStandalone } from '../data/persistence';
import { useBackupSnapshot } from '../state/useBackupSnapshot';
import { useUi } from '../state/uiStore';
import { nowIso } from '../domain/dates';
import { uk } from '../i18n/uk';
import { IconButton } from './shared';

/** М'які підказки над тижнем: встановити як застосунок і зберегти резервну копію. */
export function WeekBanners() {
  const settings = useLiveQuery(() => getSettings(), []);
  const hasActivities = useLiveQuery(
    async () => !!(await db.activities.filter((a) => !a.deletedAt).first()),
    [],
  );
  const snapshot = useBackupSnapshot();
  const showToast = useUi((s) => s.showToast);
  if (!settings || hasActivities === undefined) return null;

  const showInstall = !settings.installHintDismissedAt && !isStandalone();
  const overdue = backupOverdueDays(settings, hasActivities);

  if (!showInstall && overdue === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {overdue !== null && (
        <Banner>
          <p>{settings.lastBackupAt ? uk.week.backupDue(overdue) : uk.week.backupNever(overdue)}</p>
          <button
            type="button"
            className="btn-solid w-full sm:w-auto sm:self-start"
            onClick={() => saveBackup(snapshot, uk.settings.shareTitle).catch((e) => showToast(String(e)))}
          >
            {uk.week.saveBackup}
          </button>
        </Banner>
      )}
      {showInstall && (
        <Banner onClose={() => updateSettings({ installHintDismissedAt: nowIso() })}>
          <div>{uk.week.installHint}</div>
          <div className="text-xs text-ink-soft">{uk.week.installHow}</div>
        </Banner>
      )}
    </div>
  );
}

function Banner({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div role="note" className="relative flex flex-col gap-2 rounded-2xl bg-card px-4 py-3 text-sm shadow-sm">
      {onClose && (
        <div className="absolute top-0 right-0">
          <IconButton label={uk.week.dismiss} onClick={onClose}>✕</IconButton>
        </div>
      )}
      <div className={`flex flex-col gap-2 ${onClose ? 'pr-8' : ''}`}>{children}</div>
    </div>
  );
}
