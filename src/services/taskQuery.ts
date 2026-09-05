import type { SortDir, SortKey, Task, TaskFilters } from '../types';
import { PRIORITY_META } from '../utils/constants';
import { isOverdue } from '../utils/date';

export const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  statuses: [],
  priorities: [],
  projectId: 'all',
  showOverdueOnly: false,
};

function matchesSearch(t: Task, q: string, tagNames: string[]): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const hay = `${t.title}\n${t.description}\n${tagNames.join(' ')}`.toLowerCase();
  return query.split(/\s+/).every((token) => hay.includes(token));
}

export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  tagById: Map<string, string> = new Map(),
): Task[] {
  return tasks.filter((t) => {
    if (filters.projectId !== 'all' && t.projectId !== filters.projectId) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
    if (filters.showOverdueOnly && !isOverdue(t.dueDate, t.status)) return false;
    const names = t.tagIds.map((id) => tagById.get(id) ?? '').filter(Boolean);
    if (!matchesSearch(t, filters.search, names)) return false;
    return true;
  });
}

function dueRank(d: string | null): number {
  if (!d) return Number.POSITIVE_INFINITY;
  return Date.parse(`${d}T12:00:00`);
}

export function sortTasks(tasks: Task[], key: SortKey, dir: SortDir): Task[] {
  const mul = dir === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    switch (key) {
      case 'title':
        return a.title.localeCompare(b.title, 'pt-BR') * mul;
      case 'priority':
        return (PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank) * mul;
      case 'dueDate':
        return (dueRank(a.dueDate) - dueRank(b.dueDate)) * mul;
      case 'createdAt':
      default:
        return a.createdAt.localeCompare(b.createdAt) * mul;
    }
  });
}

export function queryTasks(
  tasks: Task[],
  filters: TaskFilters,
  sortKey: SortKey,
  sortDir: SortDir,
  tagById: Map<string, string> = new Map(),
): Task[] {
  return sortTasks(filterTasks(tasks, filters, tagById), sortKey, sortDir);
}
