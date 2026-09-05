import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, filterTasks, queryTasks, sortTasks } from '../services/taskQuery';
import type { Tag, Task } from '../types';

const TAGS: Tag[] = [
  { id: 'tg1', name: 'cliente-x', color: '#6366f1', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'tg2', name: 'docs', color: '#10b981', createdAt: '2026-01-01T00:00:00.000Z' },
];
const TAGMAP = new Map(TAGS.map((t) => [t.id, t.name] as const));

const T = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  projectId: 'p1',
  title: `Tarefa ${id}`,
  description: `descrição ${id}`,
  priority: 'medium',
  status: 'backlog',
  createdAt: `2026-01-0${id}T10:00:00.000Z`,
  updatedAt: `2026-01-0${id}T10:00:00.000Z`,
  completedAt: null,
  dueDate: null,
  tagIds: [],
  ...extra,
});

describe('filterTasks', () => {
  const tasks = [
    T('1', { title: 'Revisar proposta', tagIds: ['tg1'], priority: 'high', status: 'backlog' }),
    T('2', { title: 'Escrever docs', tagIds: ['tg2'], priority: 'low', status: 'done', projectId: 'p2' }),
    T('3', {
      title: 'Corrigir bug urgente',
      description: 'falha no login',
      priority: 'critical',
      status: 'in-progress',
      dueDate: '2000-05-01',
    }),
  ];

  it('filtra por busca em título, descrição e etiquetas (case-insensitive)', () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: 'proposta' }, TAGMAP).map((t) => t.id)).toEqual(['1']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: 'LOGIN' }, TAGMAP).map((t) => t.id)).toEqual(['3']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: 'cliente-x' }, TAGMAP).map((t) => t.id)).toEqual(['1']);
  });

  it('exige todos os tokens da busca', () => {
    expect(
      filterTasks(tasks, { ...DEFAULT_FILTERS, search: 'bug login' }, TAGMAP).map((t) => t.id),
    ).toEqual(['3']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: 'bug docs' }, TAGMAP)).toEqual([]);
  });

  it('filtra por status, prioridade e projeto', () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, statuses: ['done'] }, TAGMAP).map((t) => t.id)).toEqual(['2']);
    expect(
      filterTasks(tasks, { ...DEFAULT_FILTERS, priorities: ['critical', 'high'] }, TAGMAP).map((t) => t.id),
    ).toEqual(['1', '3']);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, projectId: 'p2' }, TAGMAP).map((t) => t.id)).toEqual(['2']);
  });

  it('filtra só atrasadas (ignora concluídas)', () => {
    const withDone = [...tasks, T('4', { status: 'done', dueDate: '2000-01-01' })];
    expect(filterTasks(withDone, { ...DEFAULT_FILTERS, showOverdueOnly: true }, TAGMAP).map((t) => t.id)).toEqual([
      '3',
    ]);
  });
});

describe('sortTasks', () => {
  it('ordena por data de criação', () => {
    const tasks = [T('3'), T('1'), T('2')];
    expect(sortTasks(tasks, 'createdAt', 'asc').map((t) => t.id)).toEqual(['1', '2', '3']);
    expect(sortTasks(tasks, 'createdAt', 'desc').map((t) => t.id)).toEqual(['3', '2', '1']);
  });

  it('ordena por prioridade (low < medium < high < critical)', () => {
    const tasks = [
      T('1', { priority: 'low' }),
      T('2', { priority: 'critical' }),
      T('3', { priority: 'high' }),
    ];
    expect(sortTasks(tasks, 'priority', 'desc').map((t) => t.id)).toEqual(['2', '3', '1']);
    expect(sortTasks(tasks, 'priority', 'asc').map((t) => t.id)).toEqual(['1', '3', '2']);
  });

  it('ordena por prazo com sem-prazo por último no asc', () => {
    const tasks = [
      T('1', { dueDate: '2026-12-01' }),
      T('2', { dueDate: null }),
      T('3', { dueDate: '2026-01-01' }),
    ];
    expect(sortTasks(tasks, 'dueDate', 'asc').map((t) => t.id)).toEqual(['3', '1', '2']);
  });

  it('ordena por título A–Z', () => {
    const tasks = [T('1', { title: 'Zebra' }), T('2', { title: 'abacaxi' }), T('3', { title: 'Manga' })];
    expect(sortTasks(tasks, 'title', 'asc').map((t) => t.id)).toEqual(['2', '3', '1']);
  });
});

describe('queryTasks', () => {
  it('combina filtro + ordenação', () => {
    const tasks = [
      T('1', { status: 'backlog', priority: 'low' }),
      T('2', { status: 'backlog', priority: 'critical' }),
      T('3', { status: 'done', priority: 'high' }),
    ];
    const out = queryTasks(tasks, { ...DEFAULT_FILTERS, statuses: ['backlog'] }, 'priority', 'desc', TAGMAP);
    expect(out.map((t) => t.id)).toEqual(['2', '1']);
  });
});
