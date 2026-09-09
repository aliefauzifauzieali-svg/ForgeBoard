import type { BackupMeta, BoardData, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES, FORMAT_VERSION } from '../types';
import { QUARANTINE_KEY, STORAGE_KEY, THEME_KEY } from '../utils/constants';
import {
  clearAllData,
  deleteBackup,
  getBackup,
  getDB,
  getKV,
  KV_BOARD,
  KV_NOTES,
  KV_PREFERENCES,
  listBackups,
  putBackup,
  setKV,
  type StoredBackup,
} from './idb';
import { localStorageProvider } from './localStorageProvider';
import { migrateToCurrent, MigrationError } from './migrations';
import { validateBoardData } from '../services/validation';

export const EMPTY_BOARD: BoardData = { version: FORMAT_VERSION, projects: [], tasks: [], tags: [] };

export const BACKUP_RETAIN = 5;
export const BACKUP_EVERY_MUTATIONS = 10;
export const BACKUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

function readLocal(key: string): string | null {
  try {
    return localStorageProvider.readKey(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorageProvider.writeKey(key, value);
  } catch {
    /* sem persistência síncrona: IDB continua valendo */
  }
}

function removeLocal(key: string): void {
  try {
    localStorageProvider.removeKey(key);
  } catch {
    /* ignore */
  }
}

function sanitizePreferences(input: unknown): UserPreferences {
  if (typeof input !== 'object' || input === null) return { ...DEFAULT_PREFERENCES };
  const p = input as Partial<UserPreferences>;
  const theme = p.theme === 'light' || p.theme === 'dark' || p.theme === 'system' ? p.theme : 'system';
  return {
    theme,
    shortcutsEnabled: p.shortcutsEnabled !== false,
    notificationsEnabled: p.notificationsEnabled === true,
    notifyDaysBefore:
      typeof p.notifyDaysBefore === 'number' && Number.isFinite(p.notifyDaysBefore)
        ? Math.min(7, Math.max(1, Math.floor(p.notifyDaysBefore)))
        : 1,
    lastView:
      p.lastView?.kind === 'project' && typeof p.lastView.projectId === 'string'
        ? { kind: 'project', projectId: p.lastView.projectId }
        : p.lastView?.kind === 'calendar' || p.lastView?.kind === 'stats' || p.lastView?.kind === 'notes'
          ? { kind: p.lastView.kind }
          : { kind: 'dashboard' },
  };
}

export interface InitialData {
  board: BoardData;
  preferences: UserPreferences;
  backups: BackupMeta[];
  /** true quando houve migração/legado (bom para toast informativo). */
  migrated: boolean;
  /** true quando os dados vieram com problema e a quarentena foi usada. */
  quarantined: boolean;
}

function toMeta(b: StoredBackup): BackupMeta {
  return {
    id: b.id,
    createdAt: b.createdAt,
    reason: b.reason,
    projects: b.snapshot.projects.length,
    tasks: b.snapshot.tasks.length,
    tags: b.snapshot.tags.length,
  };
}

/**
 * Boot: abre o IDB, carrega board + prefs + backups, migrando quando preciso.
 * Ordem: IDB atual → legado localStorage (v1, migra e remove) → vazio.
 * Falha de validação/migração: quarentena + board vazio (UI oferece recuperar).
 */
export async function loadInitialData(): Promise<InitialData> {
  const defaults: InitialData = {
    board: structuredClone(EMPTY_BOARD),
    preferences: { ...DEFAULT_PREFERENCES },
    backups: [],
    migrated: false,
    quarantined: false,
  };

  let stored: unknown = null;
  try {
    stored = await getKV<unknown>(KV_BOARD);
  } catch {
    stored = null;
  }
  if (stored) {
    try {
      const board = migrateToCurrent(stored);
      await setKV(KV_BOARD, board).catch(() => {});
      return await withPrefsAndBackups({ ...defaults, board });
    } catch {
      try {
        localStorageProvider.writeKey(QUARANTINE_KEY, JSON.stringify(stored));
      } catch {
        /* ignore */
      }
      return await withPrefsAndBackups({ ...defaults, quarantined: true });
    }
  }

  // Legado: board v1 no localStorage (versões pré-IndexedDB).
  const legacyRaw = readLocal(STORAGE_KEY);
  if (legacyRaw) {
    try {
      const parsed: unknown = JSON.parse(legacyRaw);
      const checked = validateBoardData(parsed);
      if (!checked.ok || !checked.data) throw new MigrationError('Legado inválido');
      const { migrateV1ToV2 } = await import('./migrations');
      const board = migrateV1ToV2(checked.data);
      await setKV(KV_BOARD, board).catch(() => {});
      removeLocal(STORAGE_KEY);
      return await withPrefsAndBackups({ ...defaults, board, migrated: true });
    } catch {
      try {
        localStorageProvider.writeKey(QUARANTINE_KEY, legacyRaw);
      } catch {
        /* ignore */
      }
      return await withPrefsAndBackups({ ...defaults, quarantined: true });
    }
  }

  return withPrefsAndBackups(defaults);
}

async function withPrefsAndBackups(base: InitialData): Promise<InitialData> {
  let preferences = { ...DEFAULT_PREFERENCES };
  try {
    const stored = await getKV<unknown>(KV_PREFERENCES);
    if (stored) preferences = sanitizePreferences(stored);
    else {
      // Primeira vez: herda o tema já salvo (espelho síncrono) se existir.
      const mirror = readLocal(THEME_KEY);
      if (mirror === 'light' || mirror === 'dark' || mirror === 'system') preferences.theme = mirror;
    }
  } catch {
    /* defaults */
  }
  let backups: BackupMeta[] = [];
  try {
    backups = (await listBackups()).map(toMeta);
  } catch {
    backups = [];
  }
  return { ...base, preferences, backups };
}

// ---------------------------------------------------------------------------
// Persistência. O store em memória é a fonte de verdade; o IDB recebe
// snapshots por escrita direta (barata e transacional). Erros sobem via
// exceção e o store os exibe no banner de falha de salvamento.
// ---------------------------------------------------------------------------

/** Grava o snapshot atual. Lança em falha (cota, IDB indisponível). */
export async function persistSnapshot(board: BoardData): Promise<void> {
  await setKV(KV_BOARD, board);
}

/** Metas dos backups (lista da UI), mais recentes primeiro. */
export async function listBackupMetas(): Promise<BackupMeta[]> {
  try {
    return (await listBackups()).map(toMeta);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Preferências (store separada, fora das migrações do board).
// ---------------------------------------------------------------------------

let prefsTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPrefs: UserPreferences | null = null;

export function schedulePrefsPersist(prefs: UserPreferences): void {
  pendingPrefs = prefs;
  // Espelho síncrono do tema para pintura sem flash (lido no boot).
  writeLocal(THEME_KEY, prefs.theme);
  if (prefsTimer) return;
  prefsTimer = setTimeout(() => {
    prefsTimer = null;
    const snapshot = pendingPrefs;
    pendingPrefs = null;
    if (!snapshot) return;
    setKV(KV_PREFERENCES, snapshot).catch(() => {});
  }, 400);
}

export async function flushPrefs(): Promise<void> {
  if (prefsTimer) {
    clearTimeout(prefsTimer);
    prefsTimer = null;
  }
  if (pendingPrefs) {
    const snapshot = pendingPrefs;
    pendingPrefs = null;
    await setKV(KV_PREFERENCES, snapshot).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Notas rápidas (texto livre do Dashboard, fora das migrações do board).
// ---------------------------------------------------------------------------

/** Teto do bloco de notas (evita abuso do kv). */
export const MAX_NOTES_LENGTH = 5000;

export async function readQuickNotes(): Promise<string> {
  try {
    const raw = await getKV<unknown>(KV_NOTES);
    return typeof raw === 'string' ? raw.slice(0, MAX_NOTES_LENGTH) : '';
  } catch {
    return '';
  }
}

export async function persistQuickNotes(text: string): Promise<void> {
  await setKV(KV_NOTES, text.slice(0, MAX_NOTES_LENGTH)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Backups (snapshots completos, retenção dos últimos 5).
// ---------------------------------------------------------------------------

export async function createBackup(board: BoardData, reason: 'auto' | 'manual'): Promise<BackupMeta> {
  const createdAt = new Date().toISOString();
  const backup: StoredBackup = {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    reason,
    snapshot: structuredClone(board),
  };
  await putBackup(backup);
  const all = await listBackups();
  for (const extra of all.slice(BACKUP_RETAIN)) {
    await deleteBackup(extra.id);
  }
  // Backup de boot: garante ao menos um auto por dia em uso contínuo.
  return toMeta(backup);
}

export async function readBackup(id: string): Promise<BoardData | null> {
  const found = await getBackup(id);
  if (!found) return null;
  try {
    return migrateToCurrent(found.snapshot);
  } catch {
    return null;
  }
}

export async function pruneBackups(): Promise<BackupMeta[]> {
  const all = await listBackups();
  for (const extra of all.slice(BACKUP_RETAIN)) {
    await deleteBackup(extra.id);
  }
  return (await listBackups()).map(toMeta);
}

/** Backup automático de boas-vindas se o mais recente tem +24h. */
export async function ensureDailyBackup(board: BoardData): Promise<BackupMeta | null> {
  if (board.projects.length === 0 && board.tasks.length === 0) return null;
  try {
    const all = await listBackups();
    const latest = all[0]?.createdAt ?? null;
    if (latest && Date.now() - Date.parse(latest) < BACKUP_MIN_INTERVAL_MS) return null;
    return await createBackup(board, 'auto');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Quarentena e emergência (localStorage síncrono, só recuperação).
// ---------------------------------------------------------------------------

export function readQuarantine(provider = localStorageProvider): string | null {
  try {
    return provider.readKey(QUARANTINE_KEY);
  } catch {
    return null;
  }
}

export function clearQuarantine(provider = localStorageProvider): void {
  try {
    provider.removeKey(QUARANTINE_KEY);
  } catch {
    /* ignore */
  }
}

/** Conteúdo bruto atual (backup de emergência do ErrorBoundary). */
export async function readRawBoard(): Promise<string | null> {
  try {
    const db = await getDB();
    const snapshot = await db.get('kv', KV_BOARD);
    return snapshot ? JSON.stringify(snapshot) : readLocal(STORAGE_KEY);
  } catch {
    return readLocal(STORAGE_KEY);
  }
}

/** Apaga tudo (IDB + chaves locais): recomeço limpo após falha grave. */
export async function clearAllLocalData(provider = localStorageProvider): Promise<void> {
  try {
    await clearAllData();
  } catch {
    /* ignore */
  }
  try {
    provider.removeKey(STORAGE_KEY);
    provider.removeKey(QUARANTINE_KEY);
  } catch {
    /* ignore */
  }
}
