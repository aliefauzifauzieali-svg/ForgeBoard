import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPrefs, loadInitialData } from '../storage/boardStorage';
import { dangerouslyDeleteDatabase } from '../storage/idb';
import { flushBoardStore, useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useUIStore } from '../stores/useUIStore';

async function reset(): Promise<void> {
  localStorage.clear();
  useBoardStore.setState({
    projects: [],
    tasks: [],
    tags: [],
    saveError: null,
    undoStack: [],
    redoStack: [],
    backups: [],
  });
  usePrefsStore.setState({ shortcutsEnabled: true, lastView: { kind: 'dashboard' }, hydrated: false });
  await dangerouslyDeleteDatabase();
}

describe('integração store + IndexedDB', () => {
  beforeEach(reset);

  it('roundtrip: mutações → flush → boot recarrega tudo', async () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const [tagId] = useBoardStore.getState().ensureTags(['ui']);
    useBoardStore.getState().createTask({ projectId: project.id, title: 'Tela', tagIds: tagId ? [tagId] : [] });
    usePrefsStore.getState().setShortcutsEnabled(false);
    await flushBoardStore();
    await flushPrefs();

    // Simula fechar e reabrir: limpa a memória e dá boot de novo.
    useBoardStore.setState({ projects: [], tasks: [], tags: [], backups: [] });
    const initial = await loadInitialData();
    expect(initial.board.projects.map((p) => p.name)).toEqual(['Site']);
    expect(initial.board.tasks).toHaveLength(1);
    expect(initial.board.tags.map((t) => t.name)).toEqual(['ui']);
    expect(initial.preferences.shortcutsEnabled).toBe(false);

    useBoardStore.getState().hydrate(initial.board, initial.backups);
    expect(useBoardStore.getState().tasks[0]?.tagIds).toHaveLength(1);
  });

  it('migra legado do localStorage no boot', async () => {
    localStorage.setItem(
      'forgeboard:v1',
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: 'p1',
            name: 'Antigo',
            description: '',
            color: '#6366f1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        tasks: [
          {
            id: 't1',
            projectId: 'p1',
            title: 'Velha',
            description: '',
            priority: 'medium',
            status: 'backlog',
            tags: ['legado'],
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            dueDate: null,
          },
        ],
      }),
    );
    const initial = await loadInitialData();
    expect(initial.migrated).toBe(true);
    expect(initial.board.version).toBe(2);
    expect(initial.board.tags.map((t) => t.name)).toEqual(['legado']);
  });

  it('backup manual e restauração via store', async () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    useBoardStore.getState().createManualBackup();
    await vi.waitFor(() => expect(useBoardStore.getState().backups).toHaveLength(1));

    useBoardStore.getState().deleteProject(project.id);
    expect(useBoardStore.getState().projects).toHaveLength(0);

    const backupId = useBoardStore.getState().backups[0]?.id ?? '';
    useBoardStore.getState().restoreBackup(backupId);
    await vi.waitFor(() =>
      expect(useBoardStore.getState().projects.map((p) => p.name)).toEqual(['Site']),
    );
  });

  it('boot restaura última visão válida e cai para dashboard se inválida', async () => {
    const { bootApp, resetBootForTests } = await import('../services/boot');
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    usePrefsStore.getState().setLastView({ kind: 'project', projectId: project.id });
    await flushBoardStore();
    await flushPrefs();

    // Memória limpa, como num reload de verdade.
    useBoardStore.setState({ projects: [], tasks: [], tags: [], backups: [] });
    resetBootForTests();
    await bootApp();
    expect(useUIStore.getState().view).toEqual({ kind: 'project', projectId: project.id });
    expect(useBoardStore.getState().projects).toHaveLength(1);

    // Projeto inexistente → dashboard.
    usePrefsStore.getState().setLastView({ kind: 'project', projectId: 'fantasma' });
    await flushPrefs();
    useBoardStore.setState({ projects: [], tasks: [], tags: [], backups: [] });
    resetBootForTests();
    await bootApp();
    expect(useUIStore.getState().view).toEqual({ kind: 'dashboard' });
  });
});
