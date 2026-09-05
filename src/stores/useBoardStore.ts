import { create } from 'zustand';
import type {
  BackupMeta,
  BoardData,
  Project,
  Tag,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types';
import { FORMAT_VERSION } from '../types';
import {
  createBackup,
  listBackupMetas,
  persistSnapshot,
  readBackup,
} from '../storage/boardStorage';
import { PROJECT_COLORS } from '../utils/constants';
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
  tagIds?: string[];
}

export interface HistorySnapshot {
  label: string;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
}

interface BoardState extends BoardData {
  /** true após `hydrate()` com os dados do boot. */
  hydrated: boolean;
  hydrate: (data: BoardData, backups: BackupMeta[]) => void;
  /** Mensagem quando a persistência falha (ex.: cota excedida). */
  saveError: string | null;
  dismissSaveError: () => void;
  /** Metas dos backups (lista da UI de restauração). */
  backups: BackupMeta[];
  refreshBackups: () => void;
  createManualBackup: () => void;
  restoreBackup: (id: string) => void;
  /** Histórico de desfazer/refazer — somente sessão. */
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  undo: () => void;
  redo: () => void;
  createProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => void;
  deleteProject: (id: string) => void;
  createTask: (input: CreateTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => Task | null;
  ensureTags: (names: string[]) => string[];
  createTag: (name: string, color?: string) => Tag;
  updateTag: (id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) => void;
  deleteTag: (id: string) => void;
  replaceAll: (data: BoardData) => void;
  resetAll: () => void;
  seedSample: () => void;
}

const HISTORY_LIMIT = 30;
const BACKUP_EVERY_MUTATIONS = 10;

let mutationsSinceBackup = 0;
let persistGeneration = 0;

function announce(message: string): void {
  try {
    useUIStore.getState().announce(message);
  } catch {
    /* loja de UI pode não existir em testes isolados */
  }
}

function pushToast(t: {
  kind: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; run: () => void };
}): void {
  try {
    useUIStore.getState().pushToast(t);
  } catch {
    /* ignore */
  }
}

function snapshotOf(get: () => BoardState): BoardData {
  const { projects, tasks, tags } = get();
  return { version: FORMAT_VERSION, projects, tasks, tags };
}

function persist(get: () => BoardState): void {
  const snapshot = snapshotOf(get);
  mutationsSinceBackup += 1;
  if (mutationsSinceBackup >= BACKUP_EVERY_MUTATIONS) {
    mutationsSinceBackup = 0;
    void createBackup(snapshot, 'auto')
      .then(() => useBoardStore.getState().refreshBackups())
      .catch(() => {});
  }
  // Geração: conclusões defasadas (de mutações anteriores) nunca sobrescrevem
  // o erro/sucesso da escrita mais recente.
  const gen = ++persistGeneration;
  persistSnapshot(snapshot).then(
    () => {
      if (gen === persistGeneration && get().saveError) useBoardStore.setState({ saveError: null });
    },
    (err: unknown) => {
      console.error('[ForgeBoard] falha ao persistir dados:', err);
      if (gen === persistGeneration && !get().saveError) {
        useBoardStore.setState({
          saveError:
            'Não foi possível salvar no navegador (armazenamento cheio ou indisponível). Exporte um backup para não perder seus dados.',
        });
      }
    },
  );
}

/** Grava o estado atual imediatamente (pagehide, testes). */
export async function flushBoardStore(): Promise<void> {
  const snapshot = snapshotOf(useBoardStore.getState);
  await persistSnapshot(snapshot);
}

function pushHistory(get: () => BoardState, label: string): void {
  const { projects, tasks, tags, undoStack } = get();
  // Arrays/objetos nunca são mutados in-place: a referência já é um instantâneo.
  useBoardStore.setState({
    undoStack: [...undoStack.slice(-(HISTORY_LIMIT - 1)), { label, projects, tasks, tags }],
    redoStack: [],
  });
}

function normalizeTagName(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 40);
}

function pickTagColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]!;
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  version: FORMAT_VERSION,
  projects: [],
  tasks: [],
  tags: [],
  hydrated: false,
  saveError: null,
  undoStack: [],
  redoStack: [],
  backups: [],

  hydrate: (data, backups) => {
    set({
      projects: data.projects,
      tasks: data.tasks,
      tags: data.tags,
      backups,
      hydrated: true,
    });
  },

  dismissSaveError: () => set({ saveError: null }),

  refreshBackups: () => {
    void listBackupMetas()
      .then((backups) => useBoardStore.setState({ backups }))
      .catch(() => {});
  },

  createManualBackup: () => {
    const snapshot = snapshotOf(get);
    void createBackup(snapshot, 'manual').then(
      () => {
        useBoardStore.getState().refreshBackups();
        pushToast({ kind: 'success', message: 'Backup criado' });
      },
      () => {
        pushToast({ kind: 'error', message: 'Não foi possível criar o backup' });
      },
    );
  },

  restoreBackup: (id) => {
    void readBackup(id).then((data) => {
      if (!data) {
        pushToast({ kind: 'error', message: 'Backup inválido ou ausente' });
        return;
      }
      pushHistory(get, 'restaurar backup');
      set({ projects: data.projects, tasks: data.tasks, tags: data.tags });
      persist(get);
      pushToast({
        kind: 'success',
        message: `Backup restaurado (${data.projects.length} projetos)`,
        action: { label: 'Desfazer', run: () => useBoardStore.getState().undo() },
      });
    });
  },

  undo: () => {
    const { undoStack, projects, tasks, tags } = get();
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    set((s) => ({
      projects: last.projects,
      tasks: last.tasks,
      tags: last.tags,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, { label: last.label, projects, tasks, tags }],
    }));
    persist(get);
    announce(`Desfeita: ${last.label}`);
  },

  redo: () => {
    const { redoStack, projects, tasks, tags } = get();
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    set((s) => ({
      projects: next.projects,
      tasks: next.tasks,
      tags: next.tags,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack.slice(-(HISTORY_LIMIT - 1)), { label: next.label, projects, tasks, tags }],
    }));
    persist(get);
    announce(`Refeita: ${next.label}`);
  },

  createProject: (input) => {
    const name = input.name.trim();
    if (!name) throw new Error('Nome do projeto é obrigatório');
    pushHistory(get, 'criar projeto');
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
    pushHistory(get, 'editar projeto');
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
    pushHistory(get, 'excluir projeto');
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
    persist(get);
    pushToast({
      kind: 'success',
      message: gone ? `Projeto “${gone.name}” excluído` : 'Projeto excluído',
      action: { label: 'Desfazer', run: () => useBoardStore.getState().undo() },
    });
  },

  createTask: (input) => {
    const title = input.title.trim();
    if (!title) throw new Error('Título da tarefa é obrigatório');
    if (!input.projectId) throw new Error('Projeto é obrigatório');
    pushHistory(get, 'criar tarefa');
    const status = input.status ?? 'backlog';
    const task: Task = {
      id: generateId(),
      projectId: input.projectId,
      title: title.slice(0, 140),
      description: (input.description ?? '').slice(0, 2000),
      priority: input.priority ?? 'medium',
      status,
      tagIds: (input.tagIds ?? []).slice(0, 12),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: status === 'done' ? nowIso() : null,
      dueDate: input.dueDate ?? null,
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    persist(get);
    announce(`Tarefa “${task.title}” criada`);
    return task;
  },

  updateTask: (id, patch) => {
    const title =
      patch.title !== undefined && patch.title.trim() ? patch.title.trim().slice(0, 140) : undefined;
    pushHistory(get, 'editar tarefa');
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const enteringDone = patch.status === 'done' && t.status !== 'done';
        const leavingDone = patch.status !== undefined && patch.status !== 'done' && t.status === 'done';
        return {
          ...t,
          ...(title !== undefined ? { title } : {}),
          ...(patch.description !== undefined
            ? { description: patch.description.slice(0, 2000) }
            : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(enteringDone ? { previousStatus: t.status, completedAt: nowIso() } : {}),
          ...(leavingDone ? { completedAt: null } : {}),
          ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
          ...(patch.tagIds !== undefined ? { tagIds: patch.tagIds.slice(0, 12) } : {}),
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
    pushHistory(get, 'mover tarefa');
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(status === 'done'
                ? { previousStatus: found.status, completedAt: nowIso() }
                : found.status === 'done'
                  ? { completedAt: null }
                  : {}),
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
    pushHistory(get, 'excluir tarefa');
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    persist(get);
    pushToast({
      kind: 'success',
      message: gone ? `Tarefa “${gone.title}” excluída` : 'Tarefa excluída',
      action: { label: 'Desfazer', run: () => useBoardStore.getState().undo() },
    });
  },

  duplicateTask: (id) => {
    const found = get().tasks.find((t) => t.id === id);
    if (!found) return null;
    pushHistory(get, 'duplicar tarefa');
    const copy: Task = {
      ...found,
      id: generateId(),
      title: `${found.title} (cópia)`.slice(0, 140),
      previousStatus: undefined,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ tasks: [copy, ...s.tasks] }));
    persist(get);
    announce(`Tarefa duplicada como “${copy.title}”`);
    return copy;
  },

  ensureTags: (names) => {
    const ids: string[] = [];
    const existing = new Map(get().tags.map((t) => [t.name, t] as const));
    const created: Tag[] = [];
    for (const raw of names) {
      const name = normalizeTagName(raw);
      if (!name) continue;
      const found = existing.get(name);
      if (found) {
        if (!ids.includes(found.id)) ids.push(found.id);
        continue;
      }
      const tag: Tag = {
        id: generateId(),
        name,
        color: pickTagColor(get().tags.length + created.length),
        createdAt: nowIso(),
      };
      created.push(tag);
      existing.set(name, tag);
      ids.push(tag.id);
    }
    if (created.length > 0) {
      set((s) => ({ tags: [...created, ...s.tags] }));
    }
    return ids.slice(0, 12);
  },

  createTag: (name, color) => {
    const clean = normalizeTagName(name);
    if (!clean) throw new Error('Nome da etiqueta é obrigatório');
    const dupe = get().tags.find((t) => t.name === clean);
    if (dupe) return dupe;
    pushHistory(get, 'criar etiqueta');
    const tag: Tag = {
      id: generateId(),
      name: clean,
      color: color ?? pickTagColor(get().tags.length),
      createdAt: nowIso(),
    };
    set((s) => ({ tags: [tag, ...s.tags] }));
    persist(get);
    announce(`Etiqueta “${tag.name}” criada`);
    return tag;
  },

  updateTag: (id, patch) => {
    const name =
      patch.name !== undefined && normalizeTagName(patch.name) ? normalizeTagName(patch.name) : undefined;
    if (name !== undefined) {
      const clash = get().tags.find((t) => t.name === name && t.id !== id);
      if (clash) throw new Error(`Já existe a etiqueta “${name}”`);
    }
    pushHistory(get, 'editar etiqueta');
    set((s) => ({
      tags: s.tags.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(name !== undefined ? { name } : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
            }
          : t,
      ),
    }));
    persist(get);
    announce('Etiqueta atualizada');
  },

  deleteTag: (id) => {
    const gone = get().tags.find((t) => t.id === id);
    pushHistory(get, 'excluir etiqueta');
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      tasks: s.tasks.map((t) =>
        t.tagIds.includes(id) ? { ...t, tagIds: t.tagIds.filter((x) => x !== id), updatedAt: nowIso() } : t,
      ),
    }));
    persist(get);
    pushToast({
      kind: 'success',
      message: gone ? `Etiqueta “${gone.name}” excluída` : 'Etiqueta excluída',
      action: { label: 'Desfazer', run: () => useBoardStore.getState().undo() },
    });
  },

  replaceAll: (data) => {
    pushHistory(get, 'importar dados');
    set({ projects: data.projects, tasks: data.tasks, tags: data.tags });
    persist(get);
    pushToast({
      kind: 'success',
      message: `Dados importados: ${data.projects.length} projetos e ${data.tasks.length} tarefas`,
      action: { label: 'Desfazer', run: () => useBoardStore.getState().undo() },
    });
  },

  resetAll: () => {
    pushHistory(get, 'apagar tudo');
    set({ projects: [], tasks: [], tags: [] });
    persist(get);
    announce('Todos os dados foram apagados');
  },

  seedSample: () => {
    if (get().projects.length > 0) return;
    pushHistory(get, 'carregar exemplo');
    const t = nowIso();
    const tag = (name: string, color: string): Tag => ({
      id: generateId(),
      name,
      color,
      createdAt: t,
    });
    const tags = [
      tag('design', '#8b5cf6'),
      tag('conteúdo', '#f59e0b'),
      tag('blog', '#06b6d4'),
      tag('arquitetura', '#6366f1'),
      tag('ui', '#ec4899'),
      tag('qualidade', '#10b981'),
    ];
    const tagId = (name: string): string[] => {
      const found = tags.find((x) => x.name === name);
      return found ? [found.id] : [];
    };
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
      tagIds: string[],
    ): Task => ({
      id: generateId(),
      projectId,
      title,
      description: '',
      priority,
      status,
      tagIds,
      createdAt: t,
      updatedAt: t,
      completedAt: status === 'done' ? t : null,
      dueDate,
    });
    set({
      projects: [p1, p2],
      tags,
      tasks: [
        mk(p1.id, 'Definir identidade visual', 'done', 'medium', null, tagId('design')),
        mk(p1.id, 'Escrever página sobre', 'in-progress', 'high', null, tagId('conteúdo')),
        mk(p1.id, 'Publicar primeiro post', 'backlog', 'low', null, tagId('blog')),
        mk(p2.id, 'Modelar dados e persistência', 'done', 'critical', null, tagId('arquitetura')),
        mk(p2.id, 'Implementar Kanban com drag-and-drop', 'in-progress', 'high', null, tagId('ui')),
        mk(p2.id, 'Escrever testes E2E', 'backlog', 'medium', null, tagId('qualidade')),
      ],
    });
    persist(get);
    announce('Dados de exemplo carregados');
  },
}));
