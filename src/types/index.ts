export type TaskStatus = 'backlog' | 'in-progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** Etiqueta de primeira classe (Fase 5). Tarefas referenciam por `tagIds`. */
export interface Tag {
  id: string;
  /** Normalizado em minúsculas, único (case-insensitive). */
  name: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Status anterior a uma conclusão — usado para "desmarcar" sem perder o fluxo. */
  previousStatus?: TaskStatus;
  /** Ids de `Tag`. Resolvidos para nome/cor na UI via registro. */
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  /** Preenchido ao concluir, limpo ao sair de `done`. Base dos gráficos. */
  completedAt: string | null;
  /** ISO date string (yyyy-mm-dd) or null when no deadline */
  dueDate: string | null;
}

/** Versão atual do formato de dados (ver `storage/migrations.ts`). */
export const FORMAT_VERSION = 2 as const;

export interface BoardData {
  version: typeof FORMAT_VERSION;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
}

/** Formato legado (v1): tarefas com `tags: string[]`, sem registro. */
export interface LegacyBoardData {
  version?: 1;
  projects: Project[];
  tasks: Array<Omit<Task, 'tagIds' | 'completedAt' | 'previousStatus'> & {
    tags: string[];
    completedAt?: string | null;
    previousStatus?: TaskStatus;
  }>;
}

export interface UserPreferences {
  theme: ThemePreference;
  /** Atalhos de letra (N/P///?) ligados. Ctrl+K e Esc funcionam sempre. */
  shortcutsEnabled: boolean;
  /** Última visão aberta (restaurada no boot). */
  lastView:
    | { kind: 'dashboard' }
    | { kind: 'project'; projectId: string }
    | { kind: 'calendar' }
    | { kind: 'stats' };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  shortcutsEnabled: true,
  lastView: { kind: 'dashboard' },
};

export interface BackupMeta {
  id: string;
  createdAt: string;
  reason: 'auto' | 'manual';
  projects: number;
  tasks: number;
  tags: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export type SortKey = 'createdAt' | 'dueDate' | 'priority' | 'title';
export type SortDir = 'asc' | 'desc';

export interface TaskFilters {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  projectId: string | 'all';
  showOverdueOnly: boolean;
}

export const TASK_STATUSES: TaskStatus[] = ['backlog', 'in-progress', 'done'];

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
