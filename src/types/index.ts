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

/** Nota Markdown (Fase 18.1; pastas/fixar/arquivar na revisão do editor). */
export interface Note {
  id: string;
  title: string;
  content: string;
  /** Nomes livres (não vinculados ao registro de etiquetas). */
  tags: string[];
  color?: string;
  /** Pasta livre ('' = sem pasta). */
  folder: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Hábito (Fase 18.2): 0=domingo … 6=sábado. */
export interface Habit {
  id: string;
  name: string;
  color?: string;
  schedule: { kind: 'daily' } | { kind: 'weekly'; days: number[] };
  createdAt: string;
  archived: boolean;
}

/** Categoria financeira (Fase 18.3). `kind` indica onde ela aparece. */
export interface FinanceCategory {
  id: string;
  name: string;
  color: string;
  kind: 'income' | 'expense' | 'both';
  /** Nativas não podem ser excluídas (podem ser renomeadas). */
  builtin: boolean;
}

/** Transação (Fase 18.3): valores em centavos (sem float). */
export interface Transaction {
  id: string;
  kind: 'income' | 'expense';
  /** Valor em centavos, sempre >= 0. */
  amountCents: number;
  categoryId: string;
  description: string;
  /** Dia local yyyy-mm-dd. */
  date: string;
  projectId: string | null;
  /** Meta vinculada: criar/excluir ajusta o progresso automaticamente. */
  goalId: string | null;
  createdAt: string;
}

/** Meta financeira (Fase 18.3): valores em centavos. */
export interface Goal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  /** Prazo opcional (yyyy-mm-dd). */
  deadline: string | null;
  createdAt: string;
  archived: boolean;
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
  /** Recorrência (Fase 12): `null` = sem repetição. */
  recurrence: Recurrence | null;
  /** Subtarefas (Fase 12): título + checkbox, ordem da lista. */
  subtasks: Subtask[];
}

/** Item de checklist dentro de uma tarefa (Fase 12). */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export type RecurrenceKind = 'daily' | 'weekly' | 'monthly' | 'custom';

/** Regra de repetição (Fase 12): ao concluir, gera a próxima ocorrência. */
export interface Recurrence {
  kind: RecurrenceKind;
  /** Passo da repetição em dias (custom), semanas (weekly) ou meses (monthly); daily ignora. */
  intervalDays: number;
}

export const RECURRENCE_KINDS: RecurrenceKind[] = ['daily', 'weekly', 'monthly', 'custom'];

/** Versão atual do formato de dados (ver `storage/migrations.ts`). */
export const FORMAT_VERSION = 3 as const;

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
  tasks: Array<Omit<Task, 'tagIds' | 'completedAt' | 'previousStatus' | 'recurrence' | 'subtasks'> & {
    tags: string[];
    completedAt?: string | null;
    previousStatus?: TaskStatus;
  }>;
}

export interface UserPreferences {
  theme: ThemePreference;
  /** Atalhos de letra (N/P/T///?) ligados. Ctrl+K e Esc funcionam sempre. */
  shortcutsEnabled: boolean;
  /** Notificações locais de prazo (Fase 12): exige permissão do navegador. */
  notificationsEnabled: boolean;
  /** Avisar N dias antes do vencimento (1–7). */
  notifyDaysBefore: number;
  /** Última visão aberta (restaurada no boot). */
  lastView:
    | { kind: 'dashboard' }
    | { kind: 'project'; projectId: string }
    | { kind: 'calendar' }
    | { kind: 'stats' }
    | { kind: 'notes' }
    | { kind: 'habits' }
    | { kind: 'finance' };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  shortcutsEnabled: true,
  notificationsEnabled: false,
  notifyDaysBefore: 1,
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
