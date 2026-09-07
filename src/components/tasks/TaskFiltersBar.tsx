import { useState } from 'react';
import { TASK_PRIORITIES, TASK_STATUSES, type SortDir, type SortKey } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { PRIORITY_META, STATUS_META } from '../../utils/constants';
import { cn } from '../../utils/core';

const SORT_OPTIONS: Array<{ key: SortKey; dir: SortDir; label: string }> = [
  { key: 'createdAt', dir: 'desc', label: 'Mais recentes' },
  { key: 'createdAt', dir: 'asc', label: 'Mais antigas' },
  { key: 'dueDate', dir: 'asc', label: 'Prazo próximo' },
  { key: 'priority', dir: 'desc', label: 'Prioridade alta' },
  { key: 'title', dir: 'asc', label: 'A–Z' },
];

export function TaskFiltersBar(): React.JSX.Element {
  const filters = useUIStore((s) => s.filters);
  const setFilters = useUIStore((s) => s.setFilters);
  const resetFilters = useUIStore((s) => s.resetFilters);
  const toggleStatus = useUIStore((s) => s.toggleStatusFilter);
  const togglePriority = useUIStore((s) => s.togglePriorityFilter);
  const sortKey = useUIStore((s) => s.sortKey);
  const sortDir = useUIStore((s) => s.sortDir);
  const setSort = useUIStore((s) => s.setSort);
  const [open, setOpen] = useState(false);

  const activeCount =
    filters.statuses.length + filters.priorities.length + (filters.showOverdueOnly ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-ghost !py-1.5 text-xs"
        aria-expanded={open}
        aria-controls="task-filters-panel"
        onClick={() => setOpen((v) => !v)}
      >
        Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      <label className="sr-only" htmlFor="task-sort">
        Ordenar tarefas
      </label>
      <select
        id="task-sort"
        className="input !w-auto !py-1.5 text-xs"
        value={`${sortKey}:${sortDir}`}
        onChange={(e) => {
          const [key, dir] = e.target.value.split(':') as [SortKey, SortDir];
          setSort(key, dir);
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={filters.showOverdueOnly}
          onChange={(e) => setFilters({ showOverdueOnly: e.target.checked })}
        />
        Só atrasadas
      </label>

      {activeCount > 0 || filters.search ? (
        <button
          type="button"
          className="text-xs font-semibold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
          onClick={resetFilters}
        >
          Limpar
        </button>
      ) : null}

      {open ? (
        <div
          id="task-filters-panel"
          className="card flex w-full flex-wrap gap-x-6 gap-y-3 p-3 animate-fade-up"
        >
          <fieldset>
            <legend className="label">Status</legend>
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filters.statuses.includes(s)}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                    filters.statuses.includes(s)
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Prioridade</legend>
            <div className="flex flex-wrap gap-1.5">
              {TASK_PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={filters.priorities.includes(p)}
                  onClick={() => togglePriority(p)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                    filters.priorities.includes(p)
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
                  )}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
