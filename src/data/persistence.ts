/**
 * Просить браузер не очищати IndexedDB автоматично.
 * Викликається при кожному запуску: WebKit не запам'ятовує відмову назавжди.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export interface StorageStatus {
  persisted: boolean;
  /** байтів зайнято, якщо браузер повідомляє */
  usage?: number;
}

export async function storageStatus(): Promise<StorageStatus> {
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  return { persisted, usage: estimate?.usage };
}

/** Чи запущено як встановлений застосунок (Dock / Home Screen). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || (window.matchMedia?.('(display-mode: standalone)').matches ?? false);
}
