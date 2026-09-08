import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_RETAIN,
  clearQuarantine,
  createBackup,
  ensureDailyBackup,
  flushPrefs,
  loadInitialData,
  persistSnapshot,
  pruneBackups,
  readBackup,
  readQuarantine,
  schedulePrefsPersist,
} from '../storage/boardStorage';
import { clearAppDataPreservingBackups, clearLocalData, dangerouslyDeleteDatabase, getBackup, getKV, KV_BOARD, KV_PREFERENCES, putBackup, setKV } from '../storage/idb';
import { STORAGE_KEY } from '../utils/constants';
import type { BoardData } from '../types';

const BOARD: BoardData = {
  version: 3,
  projects: [
    {
      id: 'p1',
      name: 'P1',
      description: '',
      color: '#6366f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  tasks: [],
  tags: [],
};

async function reset(): Promise<void> {
  localStorage.clear();
  await dangerouslyDeleteDatabase();
}

describe('boardStorage (IndexedDB)', () => {
  beforeEach(reset);

  it('carrega vazio na primeira execução', async () => {
    const initial = await loadInitialData();
    expect(initial.board).toEqual({ version: 3, projects: [], tasks: [], tags: [] });
    expect(initial.quarantined).toBe(false);
    expect(initial.backups).toEqual([]);
  });

  it('persiste e recarrega o snapshot (sobrevive a “reabrir”)', async () => {
    await persistSnapshot(BOARD);
    expect(await getKV(KV_BOARD)).toEqual(BOARD);
    const initial = await loadInitialData();
    expect(initial.board).toEqual(BOARD);
  });

  it('migra legado v1 do localStorage e remove a chave antiga', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        projects: BOARD.projects,
        tasks: [
          {
            id: 't1',
            projectId: 'p1',
            title: 'Antiga',
            description: '',
            priority: 'high',
            status: 'done',
            tags: ['Legado'],
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
            dueDate: null,
          },
        ],
      }),
    );
    const initial = await loadInitialData();
    expect(initial.migrated).toBe(true);
    expect(initial.board.version).toBe(3);
    expect(initial.board.tags.map((t) => t.name)).toEqual(['legado']);
    expect(initial.board.tasks[0]?.tagIds).toHaveLength(1);
    expect(initial.board.tasks[0]?.completedAt).toBe('2026-01-03T00:00:00.000Z');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readQuarantine()).toBeNull();
  });

  it('quarentena dados inválidos sem quebrar o boot', async () => {
    await setKV(KV_BOARD, { version: 2, projects: 'lixo', tasks: [], tags: [] });
    const initial = await loadInitialData();
    expect(initial.board).toEqual({ version: 3, projects: [], tasks: [], tags: [] });
    expect(initial.quarantined).toBe(true);
    expect(readQuarantine()).toContain('lixo');
    clearQuarantine();
    expect(readQuarantine()).toBeNull();
  });

  it('rejeita versão futura com quarentena', async () => {
    await setKV(KV_BOARD, { version: 99, projects: [], tasks: [], tags: [] });
    const initial = await loadInitialData();
    expect(initial.quarantined).toBe(true);
    expect(initial.board.projects).toEqual([]);
  });
});

describe('backups', () => {
  beforeEach(reset);

  it('cria, lista, lê e restaura backup', async () => {
    const meta = await createBackup(BOARD, 'manual');
    expect(meta.reason).toBe('manual');
    expect(meta.projects).toBe(1);

    const initial = await loadInitialData();
    expect(initial.backups).toHaveLength(1);

    const restored = await readBackup(meta.id);
    expect(restored).toEqual(BOARD);
    expect(await readBackup('inexistente')).toBeNull();
  });

  it('retém no máximo 5 cópias', async () => {
    for (let i = 0; i < 7; i++) {
      await createBackup(BOARD, i % 2 === 0 ? 'auto' : 'manual');
    }
    const metas = await pruneBackups();
    expect(metas.length).toBeLessThanOrEqual(BACKUP_RETAIN);
    const initial = await loadInitialData();
    expect(initial.backups).toHaveLength(BACKUP_RETAIN);
  });

  it('backup diário só quando o último tem +24h', async () => {
    const fresh = await ensureDailyBackup(BOARD);
    expect(fresh?.reason).toBe('auto');
    const skipped = await ensureDailyBackup(BOARD);
    expect(skipped).toBeNull();
    expect(await ensureDailyBackup({ version: 3, projects: [], tasks: [], tags: [] })).toBeNull();
  });
});

describe('preferências', () => {
  beforeEach(reset);

  it('salva e carrega com saneamento', async () => {
    schedulePrefsPersist({
      theme: 'dark',
      shortcutsEnabled: false,
      notificationsEnabled: true,
      notifyDaysBefore: 3,
      lastView: { kind: 'calendar' },
    });
    await flushPrefs();
    const initial = await loadInitialData();
    expect(initial.preferences).toEqual({
      theme: 'dark',
      shortcutsEnabled: false,
      notificationsEnabled: true,
      notifyDaysBefore: 3,
      lastView: { kind: 'calendar' },
    });
  });

  it('cai para defaults com payload inválido', async () => {
    await setKV(KV_PREFERENCES, { theme: 'neon', lastView: { kind: 'x' } });
    const initial = await loadInitialData();
    expect(initial.preferences.theme).toBe('system');
    expect(initial.preferences.lastView).toEqual({ kind: 'dashboard' });
  });
});

describe('clearLocalData (reset de fábrica)', () => {
  beforeEach(reset);

  it('limpa localStorage e banco', async () => {
    window.localStorage.setItem('forgeboard:theme', 'dark');
    await setKV(KV_BOARD, BOARD);
    await clearLocalData();
    expect(window.localStorage.length).toBe(0);
    await expect(getKV(KV_BOARD)).resolves.toBeNull();
  });
});

describe('clearAppDataPreservingBackups', () => {
  beforeEach(reset);

  it('limpa board e espelhos mas mantém backups', async () => {
    await setKV(KV_BOARD, BOARD);
    await putBackup({ id: 'b1', createdAt: '2026-01-01T00:00:00.000Z', reason: 'manual', snapshot: BOARD });
    await clearAppDataPreservingBackups();
    await expect(getKV(KV_BOARD)).resolves.toBeNull();
    await expect(getBackup('b1')).resolves.toMatchObject({ id: 'b1' });
  });
});
