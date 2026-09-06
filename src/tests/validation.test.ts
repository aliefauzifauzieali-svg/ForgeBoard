import { describe, expect, it } from 'vitest';
import { parseImport } from '../services/boardIO';
import { serializeBoard, validateBoardData, validateBoardV2 } from '../services/validation';
import type { BoardData, LegacyBoardData } from '../types';

const VALID_V1: LegacyBoardData = {
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
      tags: ['devops'],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      completedAt: null,
      dueDate: '2026-02-01',
    },
  ],
};

const VALID_V2: BoardData = {
  version: 3,
  projects: VALID_V1.projects,
  tags: [
    { id: 'tg1', name: 'devops', color: '#6366f1', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Fazer deploy',
      description: '',
      priority: 'high',
      status: 'backlog',
      tagIds: ['tg1'],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      completedAt: null,
      dueDate: '2026-02-01',
      recurrence: null,
      subtasks: [],
    },
  ],
};

describe('validateBoardData (v1 legado)', () => {
  it('aceita um board v1 válido', () => {
    const r = validateBoardData(VALID_V1);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(VALID_V1);
  });

  it('rejeita tarefa sem título e com projeto inexistente', () => {
    const r = validateBoardData({
      version: 1,
      projects: VALID_V1.projects,
      tasks: [{ ...VALID_V1.tasks[0], title: '  ', projectId: 'ghost' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join('|')).toMatch(/title/);
    expect(r.errors.join('|')).toMatch(/projectId/);
  });

  it('rejeita prioridade/status/dueDate inválidos', () => {
    const r = validateBoardData({
      version: 1,
      projects: VALID_V1.projects,
      tasks: [
        { ...VALID_V1.tasks[0], priority: 'urgentíssima', status: 'doing', dueDate: '01/02/2026' },
        { ...VALID_V1.tasks[0] },
      ],
    });
    expect(r.ok).toBe(false);
    const joined = r.errors.join('|');
    expect(joined).toMatch(/priority/);
    expect(joined).toMatch(/status/);
    expect(joined).toMatch(/dueDate/);
  });

  it('rejeita projeto sem nome e ids duplicados', () => {
    expect(
      validateBoardData({ version: 1, projects: [{ ...VALID_V1.projects[0], name: '   ' }], tasks: [] }).ok,
    ).toBe(false);
    expect(
      validateBoardData({
        version: 1,
        projects: [...VALID_V1.projects, { ...VALID_V1.projects[0], name: 'Dup' }],
        tasks: [],
      }).errors.join('|'),
    ).toMatch(/duplicado/);
  });
});

describe('validateBoardV2', () => {
  it('aceita um board v3 válido', () => {
    const r = validateBoardV2(VALID_V2);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(VALID_V2);
  });

  it('aceita v2 legado normalizando recorrência e subtarefas', () => {
    const { recurrence: _r, subtasks: _s, ...taskV2 } = VALID_V2.tasks[0]!;
    void _r;
    void _s;
    const r = validateBoardV2({ ...VALID_V2, version: 2, tasks: [taskV2] });
    expect(r.ok).toBe(true);
    expect(r.data?.version).toBe(3);
    expect(r.data?.tasks[0]).toMatchObject({ recurrence: null, subtasks: [] });
  });

  it('rejeita tagIds de tags inexistentes e previousStatus inválido', () => {
    const r = validateBoardV2({
      ...VALID_V2,
      tasks: [{ ...VALID_V2.tasks[0], tagIds: ['ghost'], previousStatus: 'fazendo' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join('|')).toMatch(/tagIds/);
    expect(r.errors.join('|')).toMatch(/previousStatus/);
  });

  it('rejeita versão errada e nomes de tag duplicados', () => {
    expect(validateBoardV2({ ...VALID_V2, version: 1 }).ok).toBe(false);
    expect(
      validateBoardV2({
        ...VALID_V2,
        tags: [...VALID_V2.tags, { ...VALID_V2.tags[0], id: 'tg2' }],
      }).errors.join('|'),
    ).toMatch(/duplicado/);
  });
});

describe('serializeBoard / parseImport', () => {
  it('exporta v3 com metadados e revalida (round-trip)', () => {
    const raw = serializeBoard(VALID_V2);
    expect(raw).toContain('"version": 3');
    const back = parseImport(raw);
    expect(back.ok).toBe(true);
    expect(back.migrated).toBe(false);
    expect(back.data).toEqual(VALID_V2);
  });

  it('importa v2 legado migrando para v3', () => {
    const { recurrence: _r, subtasks: _s, ...taskV2 } = VALID_V2.tasks[0]!;
    void _r;
    void _s;
    const back = parseImport(JSON.stringify({ ...VALID_V2, version: 2, tasks: [taskV2] }));
    expect(back.ok).toBe(true);
    expect(back.migrated).toBe(true);
    expect(back.data?.version).toBe(3);
  });

  it('importa legado v1 migrando para v3', () => {
    const back = parseImport(JSON.stringify(VALID_V1));
    expect(back.ok).toBe(true);
    expect(back.migrated).toBe(true);
    expect(back.data?.version).toBe(3);
    expect(back.data?.tags.map((t) => t.name)).toEqual(['devops']);
    expect(back.data?.tasks[0]?.tagIds).toHaveLength(1);
  });

  it('rejeita JSON malformado e versão futura', () => {
    expect(parseImport('{ inválido').ok).toBe(false);
    const future = parseImport(JSON.stringify({ ...VALID_V2, version: 99 }));
    expect(future.ok).toBe(false);
    expect(future.errors.join('|')).toMatch(/não suportada/);
  });
});
