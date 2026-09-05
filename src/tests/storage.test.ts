import { describe, expect, it } from 'vitest';
import {
  clearBoard,
  clearQuarantine,
  loadBoard,
  readQuarantine,
  saveBoard,
} from '../storage/boardStorage';
import { createMemoryProvider } from '../storage/localStorageProvider';
import { STORAGE_KEY } from '../utils/constants';
import type { BoardData } from '../types';

const SAMPLE: BoardData = {
  version: 1,
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
};

describe('boardStorage', () => {
  it('retorna board vazio quando nada foi salvo', () => {
    const provider = createMemoryProvider();
    expect(loadBoard(provider)).toEqual({ version: 1, projects: [], tasks: [] });
  });

  it('persiste e recarrega os dados (sobrevive a “reabrir”)', () => {
    const provider = createMemoryProvider();
    saveBoard(SAMPLE, provider);
    expect(loadBoard(provider)).toEqual(SAMPLE);
    // Simula fechar e reabrir: nova leitura do mesmo provider
    expect(loadBoard(provider).projects[0]?.name).toBe('P1');
  });

  it('limpa os dados', () => {
    const provider = createMemoryProvider();
    saveBoard(SAMPLE, provider);
    clearBoard(provider);
    expect(loadBoard(provider)).toEqual({ version: 1, projects: [], tasks: [] });
  });

  it('tolera JSON corrompido sem quebrar e preserva quarentena', () => {
    const provider = createMemoryProvider({ [STORAGE_KEY]: '{{{quebrado' });
    expect(loadBoard(provider)).toEqual({ version: 1, projects: [], tasks: [] });
    expect(readQuarantine(provider)).toBe('{{{quebrado');
    clearQuarantine(provider);
    expect(readQuarantine(provider)).toBeNull();
  });

  it('rejeita payload com forma inválida e preserva quarentena', () => {
    const raw = JSON.stringify({
      version: 1,
      projects: [{ id: 'p1', name: '', description: '', color: '#6366f1', createdAt: 'x', updatedAt: 'x' }],
      tasks: [{ id: 't1', projectId: 'p1', title: '', tags: 'nao-e-array' }],
    });
    const provider = createMemoryProvider({ [STORAGE_KEY]: raw });
    expect(loadBoard(provider)).toEqual({ version: 1, projects: [], tasks: [] });
    expect(readQuarantine(provider)).toBe(raw);
  });

  it('carrega payload válido com campo opcional previousStatus', () => {
    const provider = createMemoryProvider();
    saveBoard(
      {
        ...SAMPLE,
        tasks: [
          {
            id: 't1',
            projectId: 'p1',
            title: 'T',
            description: '',
            priority: 'low',
            status: 'done',
            previousStatus: 'in-progress',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            dueDate: null,
            tags: [],
          },
        ],
      },
      provider,
    );
    const loaded = loadBoard(provider);
    expect(loaded.tasks[0]?.previousStatus).toBe('in-progress');
    expect(readQuarantine(provider)).toBeNull();
  });
});
