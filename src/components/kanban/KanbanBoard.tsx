import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { STATUS_META } from '../../utils/constants';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';
import { TaskCard } from '../tasks/TaskCard';

const COLUMNS: TaskStatus[] = ['backlog', 'in-progress', 'done'];

export function KanbanColumn({
  status,
  tasks,
  projectColor,
  projectId,
}: {
  status: TaskStatus;
  tasks: Task[];
  projectColor?: string;
  projectId: string;
}): React.JSX.Element {
  const moveTask = useBoardStore((s) => s.moveTask);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const [over, setOver] = useState(false);

  return (
    <section
      aria-label={`Coluna ${STATUS_META[status].label}`}
      data-testid={`kanban-column-${status}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={(e) => {
        // Ignora saídas para elementos filhos (evita flicker do highlight).
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData('text/task-id');
        if (id) moveTask(id, status);
      }}
      className={cn(
        'flex w-full flex-col rounded-2xl border bg-zinc-50/80 p-3 transition animate-fade-up dark:bg-zinc-900/60 lg:w-72 lg:shrink-0 lg:snap-start xl:w-80',
        over
          ? 'border-[var(--accent)] shadow-pop ring-2 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]'
          : 'border-zinc-200 dark:border-zinc-800',
      )}
    >
      <header className="flex items-center justify-between px-1 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 rounded-full',
              status === 'backlog' && 'bg-zinc-400',
              status === 'in-progress' && 'bg-[var(--accent)]',
              status === 'done' && 'bg-emerald-500',
            )}
          />
          {STATUS_META[status].label}
          <span
            aria-label={`${tasks.length} tarefas`}
            className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {tasks.length}
          </span>
        </h3>
        <button
          type="button"
          className="icon-btn !h-7 !w-7"
          aria-label={`Adicionar tarefa em ${STATUS_META[status].label}`}
          onClick={() => openNewTask(projectId, status)}
        >
          <Plus size={15} />
        </button>
      </header>

      <div className="flex min-h-24 flex-col gap-2">
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <span className="hidden sm:inline">
              Arraste tarefas para cá
              <br />
              ou{' '}
            </span>
            crie uma nova.
          </p>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} projectColor={projectColor} />)
        )}
      </div>
    </section>
  );
}

export function KanbanBoard({
  projectId,
  tasks,
  projectColor,
}: {
  projectId: string;
  tasks: Task[];
  projectColor?: string;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-4 pb-4 stagger lg:-mx-4 lg:flex-row lg:gap-3 lg:overflow-x-auto lg:px-4 lg:snap-x lg:snap-mandatory"
      role="region"
      aria-label="Quadro Kanban. No computador, arraste tarefas entre as colunas; no touch, use os botões Mover de cada cartão."
    >
      {COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          projectId={projectId}
          projectColor={projectColor}
          tasks={tasks.filter((t) => t.status === status)}
        />
      ))}
    </div>
  );
}
