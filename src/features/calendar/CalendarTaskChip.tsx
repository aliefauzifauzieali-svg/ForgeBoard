import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Task, TaskPriority } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { STATUS_META } from '../../utils/constants';
import { isOverdue } from '../../utils/date';
import { cn } from '../../utils/core';

/** Faixa lateral do chip por prioridade (tom suave, só decorativa). */
const PRIORITY_EDGE: Record<TaskPriority, string> = {
  low: 'border-l-sky-400 dark:border-l-sky-500',
  medium: 'border-l-amber-400 dark:border-l-amber-500',
  high: 'border-l-orange-400 dark:border-l-orange-500',
  critical: 'border-l-red-500 dark:border-l-red-500',
};

/**
 * Cartão compacto de tarefa no calendário. Arrastar entre dias remarca o
 * prazo; Enter/clique abre a edição (caminho por teclado para remarcar).
 */
export function CalendarTaskChip({
  task,
  projectColor,
  projectName,
  detailed,
}: {
  task: Task;
  projectColor?: string;
  projectName?: string;
  detailed?: boolean;
}): React.JSX.Element {
  const openEditTask = useUIStore((s) => s.openEditTask);
  const overdue = isOverdue(task.dueDate, task.status);
  const done = task.status === 'done';

  const onDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('text/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      data-testid={`cal-chip-${task.id}`}
      data-task-id={task.id}
      onClick={() => openEditTask(task.id)}
      title={`${task.title}${projectName ? ` · ${projectName}` : ''}`}
      aria-label={`${task.title}. Status ${STATUS_META[task.status].label}. Ativar para editar; arraste para outro dia para remarcar.${overdue ? ' Atrasada.' : ''}`}
      className={cn(
        'flex w-full cursor-grab items-center gap-1.5 rounded-lg border border-l-2 py-1.5 pl-2 pr-2 text-left text-xs font-medium transition-[transform,box-shadow,border-color] duration-200 ease-spring hover:-translate-y-px hover:shadow-card active:cursor-grabbing',
        PRIORITY_EDGE[task.priority],
        overdue
          ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200'
          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-zinc-600',
        done && !overdue && 'opacity-75',
      )}
    >
      {projectColor ? (
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: projectColor }}
        />
      ) : null}
      <span className={cn('strike min-w-0 flex-1 truncate', done && 'strike-on')}>
        {task.title}
        {detailed && projectName ? <span className="block truncate text-[11px] font-normal opacity-70">{projectName}</span> : null}
      </span>
      {overdue ? (
        <AlertTriangle size={13} aria-hidden className="shrink-0" />
      ) : done ? (
        <CheckCircle2 size={13} aria-hidden className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : null}
    </button>
  );
}
