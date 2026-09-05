import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportBoardNow } from '../services/boardIO';
import { useUIStore } from '../stores/useUIStore';
import type { BoardData } from '../types';

const BOARD: BoardData = {
  version: 2,
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

describe('exportBoardNow', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
    vi.restoreAllMocks();
  });

  it('baixa o JSON e confirma com toast', async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:fake';
    });
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    try {
      exportBoardNow(BOARD);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('leitura falhou'));
        reader.readAsText(blobs[0]!);
      });
      const parsed = JSON.parse(text) as BoardData & { app: string };
      expect(parsed.version).toBe(2);
      expect(parsed.app).toBe('forgeboard');
      expect(parsed.projects).toHaveLength(1);
      expect(useUIStore.getState().toasts.map((t) => t.message)).toContain('Dados exportados em JSON');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
