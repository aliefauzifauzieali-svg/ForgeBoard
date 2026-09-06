import { describe, expect, it } from 'vitest';
import { boardToMarkdown, csvCell, tasksToCsv } from '../services/exportFormats';
import type { BoardData } from '../types';

const BOARD: BoardData = {
  version: 3,
  projects: [
    { id: 'p1', name: 'Site', description: 'Blog, "novo"', color: '#6366f1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'p2', name: 'Vazio', description: '', color: '#fff', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ],
  tags: [{ id: 'tg1', name: 'urgente', color: '#f00', createdAt: '2026-01-01T00:00:00.000Z' }],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Fazer, "deploy"',
      description: 'Linha 1\nLinha 2',
      priority: 'high',
      status: 'done',
      tagIds: ['tg1'],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      completedAt: '2026-01-03T00:00:00.000Z',
      dueDate: '2026-02-01',
      recurrence: { kind: 'weekly', intervalDays: 1 },
      subtasks: [{ id: 's1', title: 'Sub', done: true, createdAt: '2026-01-02T00:00:00.000Z' }],
    },
  ],
};

describe('csvCell', () => {
  it('envolve campos com vírgula, aspas e quebras', () => {
    expect(csvCell('simples')).toBe('simples');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
});

describe('tasksToCsv', () => {
  it('cabeçalho + BOM + escape RFC 4180', () => {
    const csv = tasksToCsv(BOARD);
    // Primeiro char e o BOM (U+FEFF) para o Excel.
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.substring(1).trim().split('\n');
    expect(lines[0]).toBe('projeto,titulo,descricao,status,prioridade,prazo,etiquetas,criada_em,concluida_em');
    // A descrição com quebra de linha ocupa várias linhas físicas: confere no todo.
    expect(csv).toContain('"Fazer, ""deploy"""');
    expect(csv).toContain('urgente');
    expect(csv).toContain('2026-02-01');
  });
});

describe('boardToMarkdown', () => {
  it('projetos com checklist, metas e projeto vazio', () => {
    const md = boardToMarkdown(BOARD);
    expect(md).toContain('# ForgeBoard');
    expect(md).toContain('## Site');
    expect(md).toContain('- [x] Fazer, "deploy" (high · done · prazo 2026-02-01 · #urgente · repete weekly)');
    expect(md).toContain('  - [x] Sub');
    expect(md).toContain('## Vazio');
    expect(md).toContain('_Sem tarefas._');
  });
});
