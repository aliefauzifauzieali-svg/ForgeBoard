import type { StorageProvider } from './StorageProvider';

function safeStorage(): globalThis.Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export const localStorageProvider: StorageProvider = {
  readKey(key: string) {
    try {
      return safeStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  writeKey(key: string, value: string) {
    // Pode lançar (ex.: QuotaExceededError) — o chamador decide como tratar.
    safeStorage()?.setItem(key, value);
  },
  removeKey(key: string) {
    try {
      safeStorage()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
