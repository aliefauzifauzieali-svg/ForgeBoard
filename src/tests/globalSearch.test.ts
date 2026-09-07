import { describe, expect, it } from 'vitest';
import { levenshtein, searchBoard } from '../services/globalSearch';
import type { Project, Tag, Task } from '../types';

const P = (id: string, name: string, description = ''): Project => ({
  id,
  name,
  description,
  color: '#6366f1',
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  updatedAt: `2026-01-0${id}T00:00:00.000Z`,
});

const TAGS: Tag[] = [
  { id: 'tg1', name: 'conteúdo', color: '#f59e0b', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'tg2', name: 'bug', color: '#ef4444', createdAt: '2026-01-01T00:00:00.000Z' },
];
const TAGMAP = new Map(TAGS.map((t) => [t.id, t.name] as const));

const T = (id: string, projectId: string, extra: Partial<Task> = {}): Task => {
  const base: Task = {
    id,
    projectId,
    title: `Tarefa ${id}`,
    description: '',
    priority: 'medium',
    status: 'backlog',
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

const projects = [P('1', 'Site pessoal', 'portfólio e blog'), P('2', 'ForgeBoard')];
const tasks = [
  T('1', '1', { title: 'Escrever página sobre', tagIds: ['tg1'] }),
  T('2', '2', { title: 'Corrigir bug do login', description: 'falha urgente na autenticação', tagIds: ['tg2'] }),
  T('3', '1', { title: 'Publicar primeiro post' }),
];

describe('searchBoard', () => {
  it('retorna vazio para query vazia', () => {
    expect(searchBoard(projects, tasks, '   ')).toEqual({ projects: [], tasks: [] });
  });

  it('ignora maiúsculas e acentos', () => {
    expect(searchBoard(projects, tasks, 'CONTEUDO', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, 'pagina', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['1']);
  });

  it('busca em etiquetas, descrição e nome do projeto', () => {
    expect(searchBoard(projects, tasks, 'bug', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'autenticação', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'forgeboard', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('busca projetos por nome e descrição', () => {
    expect(searchBoard(projects, tasks, 'blog').projects.map((p) => p.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, 'site').projects.map((p) => p.id)).toEqual(['1']);
  });

  it('exige todos os tokens (AND)', () => {
    expect(searchBoard(projects, tasks, 'bug login', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'bug blog', 8, TAGMAP).tasks).toEqual([]);
  });

  it('ranqueia título acima de descrição', () => {
    const ts = [
      T('1', '1', { title: 'Relatório mensal', createdAt: '2026-01-01T10:00:00.000Z' }),
      T('2', '1', { title: 'Outra coisa', description: 'relatório aqui', createdAt: '2026-01-09T10:00:00.000Z' }),
    ];
    expect(searchBoard(projects, ts, 'relatório').tasks.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('filtra por #etiqueta (prefixo, AND com texto)', () => {
    expect(searchBoard(projects, tasks, '#bug', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, '#conte', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, '#bug post', 8, TAGMAP).tasks).toEqual([]);
    expect(searchBoard(projects, tasks, '#inexistente', 8, TAGMAP).tasks).toEqual([]);
    // Só texto continua funcionando; só #tag não lista projetos.
    expect(searchBoard(projects, tasks, '#bug', 8, TAGMAP).projects).toEqual([]);
  });

  it('desempata por prioridade e prazo', () => {
    const ts = [
      T('1', '1', { title: 'X comum', priority: 'low', dueDate: '2026-01-01', createdAt: '2026-01-09T10:00:00.000Z' }),
      T('2', '1', { title: 'X comum', priority: 'critical', dueDate: '2026-06-01', createdAt: '2026-01-01T10:00:00.000Z' }),
      T('3', '1', { title: 'X comum', priority: 'critical', dueDate: '2026-02-01', createdAt: '2026-01-01T10:00:00.000Z' }),
      T('4', '1', { title: 'X comum', priority: 'critical', dueDate: null, createdAt: '2026-01-09T10:00:00.000Z' }),
    ];
    // Mesma pontuação: crítica antes de baixa; entre críticas, prazo próximo antes; sem prazo por último.
    expect(searchBoard(projects, ts, 'comum').tasks.map((t) => t.id)).toEqual(['3', '2', '4', '1']);
  });

  it('tolera erros de digitação (fuzzy)', () => {
    // 'tarfa' ~ 'tarefa'? Não há 'tarefa' nos fixtures: usa 'pagina' ~ 'pagima'.
    expect(searchBoard(projects, tasks, 'pagima', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, 'logim', 8, TAGMAP).tasks.map((t) => t.id)).toEqual(['2']);
    // Distante demais não casa.
    expect(searchBoard(projects, tasks, 'xyz', 8, TAGMAP).tasks).toEqual([]);
  });

  it('respeita o limite por lista', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      T(`${i}`, '1', { title: `tarefa comum ${i}`, createdAt: `2026-01-0${(i % 9) + 1}T10:00:00.000Z` }),
    );
    expect(searchBoard(projects, many, 'comum', 3).tasks).toHaveLength(3);
  });
});

describe('levenshtein', () => {
  it('distância com teto e early-exit', () => {
    expect(levenshtein('tarefa', 'tarefa', 2)).toBe(0);
    expect(levenshtein('tarfa', 'tarefa', 2)).toBe(1);
    expect(levenshtein('abc', 'xyz', 1)).toBeGreaterThan(1);
    expect(levenshtein('a', 'abcdef', 1)).toBeGreaterThan(1);
  });
});
