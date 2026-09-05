import { create } from 'zustand';
import type { SortDir, SortKey, TaskFilters, TaskPriority, TaskStatus } from '../types';
import { DEFAULT_FILTERS } from '../services/taskQuery';

export type View = { kind: 'dashboard' } | { kind: 'project'; projectId: string };

interface UIState {
  view: View;
  goDashboard: () => void;
  openProject: (projectId: string) => void;

  /** Último anúncio para leitores de tela (região aria-live). */
  announcement: { id: number; message: string };
  announce: (message: string) => void;

  filters: TaskFilters;
  setFilters: (patch: Partial<TaskFilters>) => void;
  resetFilters: () => void;

  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (key: SortKey, dir: SortDir) => void;

  projectModal: { open: boolean; editingId: string | null };
  openNewProject: () => void;
  openEditProject: (id: string) => void;
  closeProjectModal: () => void;

  taskModal: {
    open: boolean;
    editingId: string | null;
    presetProjectId: string | null;
    presetStatus: TaskStatus | null;
  };
  openNewTask: (presetProjectId?: string | null, presetStatus?: TaskStatus | null) => void;
  openEditTask: (id: string) => void;
  closeTaskModal: () => void;

  confirm: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    action: (() => void) | null;
  };
  askConfirm: (opts: {
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => void;
  }) => void;
  closeConfirm: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  toggleStatusFilter: (s: TaskStatus) => void;
  togglePriorityFilter: (p: TaskPriority) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  view: { kind: 'dashboard' },
  goDashboard: () => set({ view: { kind: 'dashboard' }, sidebarOpen: false }),
  openProject: (projectId) => set({ view: { kind: 'project', projectId }, sidebarOpen: false }),

  announcement: { id: 0, message: '' },
  announce: (message) =>
    set((s) => ({ announcement: { id: s.announcement.id + 1, message } })),

  filters: DEFAULT_FILTERS,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, sortKey: 'createdAt', sortDir: 'desc' }),

  sortKey: 'createdAt',
  sortDir: 'desc',
  setSort: (key, dir) => set({ sortKey: key, sortDir: dir }),

  projectModal: { open: false, editingId: null },
  openNewProject: () => set({ projectModal: { open: true, editingId: null } }),
  openEditProject: (id) => set({ projectModal: { open: true, editingId: id } }),
  closeProjectModal: () => set({ projectModal: { open: false, editingId: null } }),

  taskModal: { open: false, editingId: null, presetProjectId: null, presetStatus: null },
  openNewTask: (presetProjectId = null, presetStatus = null) =>
    set({ taskModal: { open: true, editingId: null, presetProjectId, presetStatus } }),
  openEditTask: (id) =>
    set({ taskModal: { open: true, editingId: id, presetProjectId: null, presetStatus: null } }),
  closeTaskModal: () =>
    set({ taskModal: { open: false, editingId: null, presetProjectId: null, presetStatus: null } }),

  confirm: { open: false, title: '', description: '', confirmLabel: 'Confirmar', action: null },
  askConfirm: (opts) =>
    set({
      confirm: {
        open: true,
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel ?? 'Confirmar',
        action: opts.action,
      },
    }),
  closeConfirm: () =>
    set((s) => ({ confirm: { ...s.confirm, open: false, action: null } })),

  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  toggleStatusFilter: (st) =>
    set((s) => ({
      filters: {
        ...s.filters,
        statuses: s.filters.statuses.includes(st)
          ? s.filters.statuses.filter((x) => x !== st)
          : [...s.filters.statuses, st],
      },
    })),
  togglePriorityFilter: (p) =>
    set((s) => ({
      filters: {
        ...s.filters,
        priorities: s.filters.priorities.includes(p)
          ? s.filters.priorities.filter((x) => x !== p)
          : [...s.filters.priorities, p],
      },
    })),
}));
