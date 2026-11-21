import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { getSettings, updateSettings } from '../data/repos/settings';
import { backupOverdueDays, saveBackup } from '../data/backup';
import { isStandalone } from '../data/persistence';
import { nowIso } from '../domain/dates';
import { uk } from '../i18n/uk';

/** М'які підказки над тижнем: встановити як застосунок і зберегти резервну копію. */
export function WeekBanners() {
  const settings = useLiveQuery(() => getSettings(), []);
  const hasActivities = useLiveQuery(
    async () => !!(await db.activities.filter((a) => !a.deletedAt).first()),
    [],
  );
  if (!settings || hasActivities === undefined) return null;

  const showInstall = !settings.installHintDismissedAt && !isStandalone();
  const overdue = backupOverdueDays(settings, hasActivities);

  if (!showInstall && overdue === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {overdue !== null && (
        <Banner>
          <span className="mr-auto">
            {settings.lastBackupAt ? uk.week.backupDue(overdue) : uk.week.backupNever(overdue)}
          </span>
          <button type="button" className="btn-solid text-sm" onClick={() => saveBackup()}>
            {uk.week.saveBackup}
          </button>
        </Banner>
      )}
      {showInstall && (
        <Banner>
          <div className="mr-auto min-w-0 flex-1">
            <div>{uk.week.installHint}</div>
            <div className="text-xs text-ink-soft">{uk.week.installHow}</div>
          </div>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => updateSettings({ installHintDismissedAt: nowIso() })}
          >
            {uk.week.dismiss}
          </button>
        </Banner>
      )}
    </div>
  );
}

function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex flex-wrap items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm shadow-sm">
      {children}
    </div>
  );
}
