import { describe, expect, it } from 'vitest';
import { searchBoard } from '../services/globalSearch';
import type { Project, Task } from '../types';

const P = (id: string, name: string, description = ''): Project => ({
  id,
  name,
  description,
  color: '#6366f1',
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  updatedAt: `2026-01-0${id}T00:00:00.000Z`,
});

const T = (id: string, projectId: string, extra: Partial<Task> = {}): Task => ({
  id,
  projectId,
  title: `Tarefa ${id}`,
  description: '',
  priority: 'medium',
  status: 'backlog',
  createdAt: `2026-01-0${id}T10:00:00.000Z`,
  updatedAt: `2026-01-0${id}T10:00:00.000Z`,
  dueDate: null,
  tags: [],
  ...extra,
});

const projects = [P('1', 'Site pessoal', 'portfólio e blog'), P('2', 'ForgeBoard')];
const tasks = [
  T('1', '1', { title: 'Escrever página sobre', tags: ['conteúdo'] }),
  T('2', '2', { title: 'Corrigir bug do login', description: 'falha urgente na autenticação', tags: ['bug'] }),
  T('3', '1', { title: 'Publicar primeiro post' }),
];

describe('searchBoard', () => {
  it('retorna vazio para query vazia', () => {
    expect(searchBoard(projects, tasks, '   ')).toEqual({ projects: [], tasks: [] });
  });

  it('ignora maiúsculas e acentos', () => {
    expect(searchBoard(projects, tasks, 'CONTEUDO').tasks.map((t) => t.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, 'pagina').tasks.map((t) => t.id)).toEqual(['1']);
  });

  it('busca em tags, descrição e nome do projeto', () => {
    expect(searchBoard(projects, tasks, 'bug').tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'autenticação').tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'forgeboard').tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('busca projetos por nome e descrição', () => {
    expect(searchBoard(projects, tasks, 'blog').projects.map((p) => p.id)).toEqual(['1']);
    expect(searchBoard(projects, tasks, 'site').projects.map((p) => p.id)).toEqual(['1']);
  });

  it('exige todos os tokens (AND)', () => {
    expect(searchBoard(projects, tasks, 'bug login').tasks.map((t) => t.id)).toEqual(['2']);
    expect(searchBoard(projects, tasks, 'bug blog').tasks).toEqual([]);
  });

  it('ranqueia título acima de descrição', () => {
    const ts = [
      T('1', '1', { title: 'Relatório mensal', createdAt: '2026-01-01T10:00:00.000Z' }),
      T('2', '1', { title: 'Outra coisa', description: 'relatório aqui', createdAt: '2026-01-09T10:00:00.000Z' }),
    ];
    expect(searchBoard(projects, ts, 'relatório').tasks.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('respeita o limite por lista', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      T(`${i}`, '1', { title: `tarefa comum ${i}`, createdAt: `2026-01-0${(i % 9) + 1}T10:00:00.000Z` }),
    );
    expect(searchBoard(projects, many, 'comum', 3).tasks).toHaveLength(3);
  });
});
