import { useLiveQuery } from 'dexie-react-hooks';
import { exportData, type Backup } from '../data/backup';

/**
 * Актуальні дані для резервної копії, підготовлені до тапу:
 * так `navigator.share` викликається без `await` і не втрачає жест користувача.
 */
export function useBackupSnapshot(): Backup | undefined {
  return useLiveQuery(() => exportData(), []);
}
