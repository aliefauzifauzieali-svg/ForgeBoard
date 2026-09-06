import { describe, expect, it } from 'vitest';
import {
  completionsPerDay,
  completionRate,
  leadTimeStats,
  priorityDistribution,
} from '../services/stats';
import type { Task } from '../types';

const T = (id: string, extra: Partial<Task> = {}): Task => {
  const base: Task = {
    id,
    projectId: 'p1',
    title: `Tarefa ${id}`,
    description: '',
    priority: 'medium',
    status: 'backlog',
    tagIds: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    completedAt: null,
    dueDate: null,
    recurrence: null,
    subtasks: [],
  };
  return Object.assign(base, extra);
};

describe('completionsPerDay', () => {
  it('conta conclusões por dia com completedAt válido', () => {
    const tasks = [
      T('1', { status: 'done', completedAt: '2026-09-10T12:00:00.000Z' }),
      T('2', { status: 'done', completedAt: '2026-09-10T18:00:00.000Z' }),
      T('3', { status: 'done', completedAt: '2026-09-08T12:00:00.000Z' }),
      T('4', { status: 'backlog', completedAt: null }),
      T('5', { status: 'done', completedAt: 'invalida' }),
    ];
    const days = completionsPerDay(tasks, 14, new Date(2026, 8, 12));
    expect(days).toHaveLength(14);
    expect(days.find((d) => d.iso === '2026-09-10')?.count).toBe(2);
    expect(days.find((d) => d.iso === '2026-09-08')?.count).toBe(1);
    expect(days.find((d) => d.iso === '2026-09-09')?.count).toBe(0);
    expect(days[days.length - 1]?.iso).toBe('2026-09-12');
  });
});

describe('priorityDistribution', () => {
  it('retorna as 4 fatias em ordem fixa', () => {
    const tasks = [T('1', { priority: 'low' }), T('2', { priority: 'low' }), T('3', { priority: 'critical' })];
    expect(priorityDistribution(tasks)).toEqual([
      { priority: 'low', label: 'Baixa', count: 2 },
      { priority: 'medium', label: 'Média', count: 0 },
      { priority: 'high', label: 'Alta', count: 0 },
      { priority: 'critical', label: 'Crítica', count: 1 },
    ]);
  });
});

describe('leadTimeStats / completionRate', () => {
  it('calcula média em dias ignorando inválidos', () => {
    const tasks = [
      T('1', { status: 'done', createdAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-03T00:00:00.000Z' }),
      T('2', { status: 'done', createdAt: '2026-09-01T00:00:00.000Z', completedAt: '2026-09-05T00:00:00.000Z' }),
      T('3', { status: 'backlog' }),
    ];
    expect(leadTimeStats(tasks)).toEqual({ averageDays: 3, completed: 2 });
    expect(leadTimeStats([])).toEqual({ averageDays: null, completed: 0 });
  });

  it('taxa de conclusão', () => {
    expect(completionRate([])).toBe(0);
    expect(completionRate([T('1', { status: 'done' }), T('2'), T('3'), T('4')])).toBe(25);
  });
});
