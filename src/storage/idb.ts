import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BoardData } from '../types';

export const DB_NAME = 'forgeboard';
const DB_VERSION = 1;

/** Chaves do object store `kv`. */
export const KV_BOARD = 'board';
export const KV_PREFERENCES = 'preferences';

export interface StoredBackup {
  id: string;
  createdAt: string;
  reason: 'auto' | 'manual';
  snapshot: BoardData;
}

interface ForgeBoardDB extends DBSchema {
  kv: { key: string; value: unknown };
  backups: { key: string; value: StoredBackup };
}

let dbPromise: Promise<IDBPDatabase<ForgeBoardDB>> | null = null;

/** Conexão compartilhada (o IndexedDB exige mesma versão em todas as abas). */
export function getDB(): Promise<IDBPDatabase<ForgeBoardDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ForgeBoardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups');
      },
    });
  }
  return dbPromise;
}

export async function getKV<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return ((await db.get('kv', key)) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function setKV(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['kv', 'backups'], 'readwrite');
  await tx.objectStore('kv').put(value, key);
  await tx.done;
}

export async function listBackups(): Promise<StoredBackup[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('backups');
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function putBackup(backup: StoredBackup): Promise<void> {
  const db = await getDB();
  await db.put('backups', backup, backup.id);
}

export async function getBackup(id: string): Promise<StoredBackup | null> {
  try {
    const db = await getDB();
    return (await db.get('backups', id)) ?? null;
  } catch {
    return null;
  }
}

export async function deleteBackup(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('backups', id);
  } catch {
    /* ignore */
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['kv', 'backups'], 'readwrite');
  await tx.objectStore('kv').clear();
  await tx.objectStore('backups').clear();
  await tx.done;
}

/** Apaga o banco inteiro (testes + reset total). Fecha a conexão antes. */
export async function dangerouslyDeleteDatabase(): Promise<void> {
  try {
    (await dbPromise?.catch(() => null))?.close();
  } catch {
    /* ignore */
  }
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'));
      req.onblocked = () => resolve(); // libera no reload/fechamento
    } catch (err) {
      reject(err);
    }
  });
}
