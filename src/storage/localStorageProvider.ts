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

/** Provider em memória — usado em testes e como fallback SSR. */
export function createMemoryProvider(initial: Record<string, string> = {}): StorageProvider {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    readKey: (key: string) => store.get(key) ?? null,
    writeKey: (key: string, value: string) => {
      store.set(key, value);
    },
    removeKey: (key: string) => {
      store.delete(key);
    },
  };
}
