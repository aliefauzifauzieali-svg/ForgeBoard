import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBoardStore } from '../stores/useBoardStore';
import { useUIStore } from '../stores/useUIStore';

vi.mock('../storage/boardStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../storage/boardStorage')>();
  return {
    ...actual,
    loadInitialData: async () => {
      throw new Error('IDB quebrado');
    },
  };
});

describe('boot resiliente', () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardStore.setState({ projects: [], tasks: [], tags: [], backups: [] });
    useUIStore.setState({ toasts: [] });
  });

  it('storage indisponível hidrata vazio e avisa (sem travar)', async () => {
    const { bootApp, resetBootForTests } = await import('../services/boot');
    resetBootForTests();
    await bootApp();
    expect(useBoardStore.getState().hydrated).toBe(true);
    expect(useBoardStore.getState().projects).toEqual([]);
    expect(useUIStore.getState().toasts.map((t) => t.message)).toContain(
      'Armazenamento indisponível — os dados podem não carregar',
    );
  });
});
