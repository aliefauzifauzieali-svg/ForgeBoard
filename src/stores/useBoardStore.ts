import { create } from 'zustand';
import type { BoardData, Project, Task, TaskPriority, TaskStatus } from '../types';
import { loadBoard, saveBoard } from '../storage/boardStorage';
import { generateId, nowIso } from '../utils/core';
import { STATUS_META } from '../utils/constants';
import { useUIStore } from './useUIStore';

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  tags?: string[];
}

interface BoardState extends BoardData {
  /** true após `hydrate()` ter carregado o storage (main.tsx chama no boot). */
  hydrated: boolean;
  hydrate: () => void;
  /** Mensagem quando a persistência falha (ex.: cota excedida). */
  saveError: string | null;
  dismissSaveError: () => void;
  createProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => void;
  deleteProject: (id: string) => void;
  createTask: (input: CreateTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => Task | null;
  replaceAll: (data: BoardData) => void;
  resetAll: () => void;
  seedSample: () => void;
}

function announce(message: string): void {
  try {
    useUIStore.getState().announce(message);
  } catch {
    /* loja de UI pode não existir em testes isolados */
  }
}

function persist(get: () => BoardState): void {
  const { projects, tasks } = get();
  try {
    saveBoard({ version: 1, projects, tasks });
    if (get().saveError) useBoardStore.setState({ saveError: null });
  } catch (err) {
    console.error('[ForgeBoard] falha ao persistir dados:', err);
    if (!get().saveError) {
      useBoardStore.setState({
        saveError:
          'Não foi possível salvar no navegador (armazenamento cheio ou indisponível). Exporte um backup para não perder seus dados.',
      });
    }
  }
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  version: 1,
  projects: [],
  tasks: [],
  hydrated: false,
  saveError: null,

  hydrate: () => {
    if (get().hydrated) return;
    const data = loadBoard();
    set({ projects: data.projects, tasks: data.tasks, hydrated: true });
  },

  dismissSaveError: () => set({ saveError: null }),

  createProject: (input) => {
    const name = input.name.trim();
    if (!name) throw new Error('Nome do projeto é obrigatório');
    const project: Project = {
      id: generateId(),
      name: name.slice(0, 80),
      description: (input.description ?? '').slice(0, 500),
      color: input.color ?? '#6366f1',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    persist(get);
    announce(`Projeto “${project.name}” criado`);
    return project;
  },

  updateProject: (id, patch) => {
    const name = patch.name !== undefined && patch.name.trim() ? patch.name.trim().slice(0, 80) : undefined;
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              ...(name !== undefined ? { name } : {}),
              ...(patch.description !== undefined
                ? { description: patch.description.slice(0, 500) }
                : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              updatedAt: nowIso(),
            }
          : p,
      ),
    }));
    persist(get);
    announce('Projeto atualizado');
  },

  deleteProject: (id) => {
    const gone = get().projects.find((p) => p.id === id);
    const count = get().tasks.filter((t) => t.projectId === id).length;
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
    persist(get);
    announce(gone ? `Projeto “${gone.name}” excluído com ${count} tarefas` : 'Projeto excluído');
  },

  createTask: (input) => {
    const title = input.title.trim();
    if (!title) throw new Error('Título da tarefa é obrigatório');
    if (!input.projectId) throw new Error('Projeto é obrigatório');
    const task: Task = {
      id: generateId(),
      projectId: input.projectId,
      title: title.slice(0, 140),
      description: (input.description ?? '').slice(0, 2000),
      priority: input.priority ?? 'medium',
      status: input.status ?? 'backlog',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      dueDate: input.dueDate ?? null,
      tags: (input.tags ?? []).slice(0, 12),
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    persist(get);
    announce(`Tarefa “${task.title}” criada`);
    return task;
  },

  updateTask: (id, patch) => {
    const title =
      patch.title !== undefined && patch.title.trim() ? patch.title.trim().slice(0, 140) : undefined;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const enteringDone = patch.status === 'done' && t.status !== 'done';
        return {
          ...t,
          ...(title !== undefined ? { title } : {}),
          ...(patch.description !== undefined
            ? { description: patch.description.slice(0, 2000) }
            : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(enteringDone ? { previousStatus: t.status } : {}),
          ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags.slice(0, 12) } : {}),
          ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
          updatedAt: nowIso(),
        };
      }),
    }));
    persist(get);
    announce('Tarefa atualizada');
  },

  moveTask: (id, status) => {
    const found = get().tasks.find((t) => t.id === id);
    if (!found || found.status === status) return;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(status === 'done' ? { previousStatus: found.status } : {}),
              updatedAt: nowIso(),
            }
          : t,
      ),
    }));
    persist(get);
    announce(`Tarefa “${found.title}” movida para ${STATUS_META[status].label}`);
  },

  deleteTask: (id) => {
    const gone = get().tasks.find((t) => t.id === id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    persist(get);
    announce(gone ? `Tarefa “${gone.title}” excluída` : 'Tarefa excluída');
  },

  duplicateTask: (id) => {
    const found = get().tasks.find((t) => t.id === id);
    if (!found) return null;
    const copy: Task = {
      ...found,
      id: generateId(),
      title: `${found.title} (cópia)`.slice(0, 140),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ tasks: [copy, ...s.tasks] }));
    persist(get);
    announce(`Tarefa duplicada como “${copy.title}”`);
    return copy;
  },

  replaceAll: (data) => {
    set({ projects: data.projects, tasks: data.tasks });
    persist(get);
    announce(`Dados importados: ${data.projects.length} projetos e ${data.tasks.length} tarefas`);
  },

  resetAll: () => {
    set({ projects: [], tasks: [] });
    persist(get);
    announce('Todos os dados foram apagados');
  },

  seedSample: () => {
    if (get().projects.length > 0) return;
    const t = nowIso();
    const p1: Project = {
      id: generateId(),
      name: 'Site pessoal',
      description: 'Redesign do portfólio com blog e estudos de caso.',
      color: '#6366f1',
      createdAt: t,
      updatedAt: t,
    };
    const p2: Project = {
      id: generateId(),
      name: 'ForgeBoard',
      description: 'Construir este dashboard local-first.',
      color: '#10b981',
      createdAt: t,
      updatedAt: t,
    };
    const mk = (
      projectId: string,
      title: string,
      status: TaskStatus,
      priority: Task['priority'],
      dueDate: string | null,
      tags: string[],
    ): Task => ({
      id: generateId(),
      projectId,
      title,
      description: '',
      priority,
      status,
      createdAt: t,
      updatedAt: t,
      dueDate,
      tags,
    });
    set({
      projects: [p1, p2],
      tasks: [
        mk(p1.id, 'Definir identidade visual', 'done', 'medium', null, ['design']),
        mk(p1.id, 'Escrever página sobre', 'in-progress', 'high', null, ['conteúdo']),
        mk(p1.id, 'Publicar primeiro post', 'backlog', 'low', null, ['blog']),
        mk(p2.id, 'Modelar dados e persistência', 'done', 'critical', null, ['arquitetura']),
        mk(p2.id, 'Implementar Kanban com drag-and-drop', 'in-progress', 'high', null, ['ui']),
        mk(p2.id, 'Escrever testes E2E', 'backlog', 'medium', null, ['qualidade']),
      ],
    });
    persist(get);
    announce('Dados de exemplo carregados');
  },
}));
