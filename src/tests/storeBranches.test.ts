import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dangerouslyDeleteDatabase } from '../storage/idb';
import { useBoardStore } from '../stores/useBoardStore';

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
  await dangerouslyDeleteDatabase();
}

describe('useBoardStore — ramos condicionais', () => {
  beforeEach(reset);

  it('seedSample popula vazio e respeita board existente', () => {
    useBoardStore.getState().seedSample();
    expect(useBoardStore.getState().projects).toHaveLength(2);
    expect(useBoardStore.getState().tasks).toHaveLength(6);
    expect(useBoardStore.getState().tags.length).toBeGreaterThan(0);
    const before = useBoardStore.getState().projects;
    useBoardStore.getState().seedSample();
    expect(useBoardStore.getState().projects).toBe(before);
  });

  it('resetAll limpa o board', () => {
    useBoardStore.getState().createProject({ name: 'Site' });
    useBoardStore.getState().resetAll();
    expect(useBoardStore.getState().projects).toEqual([]);
    expect(useBoardStore.getState().tasks).toEqual([]);
    expect(useBoardStore.getState().tags).toEqual([]);
  });

  it('deleteProject inexistente não quebra e avisa genérico', () => {
    useBoardStore.getState().deleteProject('fantasma');
    expect(useBoardStore.getState().projects).toEqual([]);
  });

  it('duplicateTask inexistente retorna null', () => {
    expect(useBoardStore.getState().duplicateTask('fantasma')).toBeNull();
  });

  it('restoreBackup inválido avisa erro via toast', async () => {
    const { useUIStore } = await import('../stores/useUIStore');
    useUIStore.setState({ toasts: [] });
    useBoardStore.getState().restoreBackup('inexistente');
    await vi.waitFor(() => expect(useUIStore.getState().toasts.map((t) => t.kind)).toContain('error'));
  });
});
