import { describe, expect, it } from 'vitest';
import type { Project, Task } from '../types';
import {
  allProgress,
  boardStats,
  overdueTasks,
  projectProgress,
  recentTasks,
  tasksDueToday,
} from '../services/boardStats';

const P = (id: string): Project => ({
  id,
  name: `Projeto ${id}`,
  description: '',
  color: '#6366f1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const T = (id: string, projectId: string, status: Task['status'], extra: Partial<Task> = {}): Task => {
  const base: Task = {
    id,
    projectId,
    title: `Tarefa ${id}`,
    description: '',
    priority: 'medium',
    status,
    createdAt: `2026-01-0${id}T10:00:00.000Z`,
    updatedAt: `2026-01-0${id}T10:00:00.000Z`,
    completedAt: null,
    dueDate: null,
    tagIds: [],
    recurrence: null,
    subtasks: [],
  };
  return Object.assign(base, extra);
};

describe('projectProgress', () => {
  it('retorna 0% quando o projeto não tem tarefas', () => {
    expect(projectProgress('p1', [])).toEqual({ projectId: 'p1', total: 0, done: 0, percent: 0 });
  });

  it('calcula o percentual de concluídas apenas do projeto', () => {
    const tasks = [
      T('1', 'p1', 'done'),
      T('2', 'p1', 'backlog'),
      T('3', 'p1', 'in-progress'),
      T('4', 'p1', 'done'),
      T('5', 'p2', 'done'),
    ];
    expect(projectProgress('p1', tasks)).toEqual({ projectId: 'p1', total: 4, done: 2, percent: 50 });
  });

  it('arredonda o percentual', () => {
    const tasks = [T('1', 'p1', 'done'), T('2', 'p1', 'backlog'), T('3', 'p1', 'backlog')];
    expect(projectProgress('p1', tasks).percent).toBe(33);
  });
});

describe('allProgress', () => {
  it('calcula para todos os projetos', () => {
    const projects = [P('p1'), P('p2')];
    const tasks = [T('1', 'p1', 'done'), T('2', 'p2', 'backlog')];
    expect(allProgress(projects, tasks)).toEqual([
      { projectId: 'p1', total: 1, done: 1, percent: 100 },
      { projectId: 'p2', total: 1, done: 0, percent: 0 },
    ]);
  });
});

describe('boardStats', () => {
  it('agrega totais, taxa de conclusão e atrasadas', () => {
    const projects = [P('p1')];
    const tasks = [
      T('1', 'p1', 'done'),
      T('2', 'p1', 'backlog', { dueDate: '2000-01-01' }),
      T('3', 'p1', 'in-progress', { dueDate: '2000-01-01' }),
      T('4', 'p1', 'done', { dueDate: '2000-01-01' }), // concluída não conta como atrasada
    ];
    const stats = boardStats(projects, tasks);
    expect(stats).toMatchObject({
      totalProjects: 1,
      totalTasks: 4,
      doneTasks: 2,
      openTasks: 2,
      overdueTasks: 2,
      completionRate: 50,
    });
  });

  it('retorna zeros com board vazio', () => {
    expect(boardStats([], [])).toMatchObject({
      totalProjects: 0,
      totalTasks: 0,
      completionRate: 0,
    });
  });
});

describe('overdueTasks / recentTasks', () => {
  it('lista apenas atrasadas ordenadas por prazo', () => {
    const tasks = [
      T('1', 'p1', 'backlog', { dueDate: '2000-03-01' }),
      T('2', 'p1', 'backlog', { dueDate: '2000-01-01' }),
      T('3', 'p1', 'done', { dueDate: '2000-01-01' }),
      T('4', 'p1', 'backlog', { dueDate: null }),
    ];
    expect(overdueTasks(tasks).map((t) => t.id)).toEqual(['2', '1']);
  });

  it('retorna as mais recentes primeiro respeitando o limite', () => {
    const tasks = [T('1', 'p1', 'backlog'), T('2', 'p1', 'backlog'), T('3', 'p1', 'backlog')];
    expect(recentTasks(tasks, 2).map((t) => t.id)).toEqual(['3', '2']);
  });
});

describe('tasksDueToday', () => {
  const tasks = [
    T('1', 'p1', 'backlog', { dueDate: '2026-09-06' }),
    T('2', 'p1', 'in-progress', { dueDate: '2026-09-06' }),
    T('3', 'p1', 'done', { dueDate: '2026-09-06' }),
    T('4', 'p1', 'backlog', { dueDate: '2026-09-07' }),
    T('5', 'p1', 'backlog', { dueDate: null }),
  ];
  it('só abertas com prazo hoje', () => {
    expect(tasksDueToday(tasks, '2026-09-06').map((t) => t.id)).toEqual(['1', '2']);
  });
});
