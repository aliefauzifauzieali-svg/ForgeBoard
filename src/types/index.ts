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

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Status anterior a uma conclusão — usado para "desmarcar" sem perder o fluxo. */
  previousStatus?: TaskStatus;
  createdAt: string;
  updatedAt: string;
  /** ISO date string (yyyy-mm-dd) or null when no deadline */
  dueDate: string | null;
  tags: string[];
}

export interface BoardData {
  version: 1;
  projects: Project[];
  tasks: Task[];
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
