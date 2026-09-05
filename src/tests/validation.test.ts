import { describe, expect, it } from 'vitest';
import { parseImport, serializeBoard, validateBoardData } from '../services/validation';
import type { BoardData } from '../types';

const VALID: BoardData = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Site',
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
      title: 'Fazer deploy',
      description: '',
      priority: 'high',
      status: 'backlog',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      dueDate: '2026-02-01',
      tags: ['devops'],
    },
  ],
};

describe('validateBoardData', () => {
  it('aceita um board válido', () => {
    const r = validateBoardData(VALID);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(VALID);
    expect(r.errors).toEqual([]);
  });

  it('rejeita JSON malformado no parseImport', () => {
    const r = parseImport('{ inválido');
    expect(r.ok).toBe(false);
    expect(r.data).toBeNull();
  });

  it('rejeita raiz não-objeto e arrays ausentes', () => {
    expect(validateBoardData(null).ok).toBe(false);
    expect(validateBoardData({ projects: [], tasks: 'x' }).ok).toBe(false);
  });

  it('rejeita tarefa sem título e com projeto inexistente', () => {
    const r = validateBoardData({
      version: 1,
      projects: VALID.projects,
      tasks: [{ ...VALID.tasks[0], title: '  ', projectId: 'ghost' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join('|')).toMatch(/title/);
    expect(r.errors.join('|')).toMatch(/projectId/);
  });

  it('rejeita prioridade/status/dueDate inválidos e ids duplicados', () => {
    const r = validateBoardData({
      version: 1,
      projects: VALID.projects,
      tasks: [
        { ...VALID.tasks[0], priority: 'urgentíssima', status: 'doing', dueDate: '01/02/2026' },
        { ...VALID.tasks[0] },
      ],
    });
    expect(r.ok).toBe(false);
    const joined = r.errors.join('|');
    expect(joined).toMatch(/priority/);
    expect(joined).toMatch(/status/);
    expect(joined).toMatch(/dueDate/);
  });

  it('rejeita projeto sem nome', () => {
    const r = validateBoardData({
      version: 1,
      projects: [{ ...VALID.projects[0], name: '   ' }],
      tasks: [],
    });
    expect(r.ok).toBe(false);
  });

  it('aceita previousStatus válido e rejeita inválido', () => {
    const okResult = validateBoardData({
      version: 1,
      projects: VALID.projects,
      tasks: [{ ...VALID.tasks[0], status: 'done', previousStatus: 'in-progress' }],
    });
    expect(okResult.ok).toBe(true);
    expect(okResult.data?.tasks[0]?.previousStatus).toBe('in-progress');

    const badResult = validateBoardData({
      version: 1,
      projects: VALID.projects,
      tasks: [{ ...VALID.tasks[0], previousStatus: 'fazendo' }],
    });
    expect(badResult.ok).toBe(false);
    expect(badResult.errors.join('|')).toMatch(/previousStatus/);
  });

  it('descarta item com erro sem mascarar com mensagens genéricas', () => {
    const r = validateBoardData({
      version: 1,
      projects: [...VALID.projects, { ...VALID.projects[0], id: 'p1', name: 'Duplicado' }],
      tasks: [],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join('|')).toMatch(/duplicado/);
  });
});

describe('serializeBoard', () => {
  it('exporta JSON válido que revalida (round-trip)', () => {
    const raw = serializeBoard(VALID);
    const back = parseImport(raw);
    expect(back.ok).toBe(true);
    expect(back.data).toEqual(VALID);
  });
});
