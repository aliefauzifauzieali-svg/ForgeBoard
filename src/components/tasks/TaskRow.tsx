import { CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { isOverdue, toDateOnly } from '../../utils/date';
import { PriorityBadge } from '../ui/Badges';

export function TaskRow({ task, projectName }: { task: Task; projectName?: string }): React.JSX.Element {
  const openEditTask = useUIStore((s) => s.openEditTask);
  const moveTask = useBoardStore((s) => s.moveTask);
  const done = task.status === 'done';
  const overdue = isOverdue(task.dueDate, task.status);
  const allTags = useBoardStore((s) => s.tags);
  const tagNames = task.tagIds
    .map((id) => allTags.find((t) => t.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <li
      data-testid={`task-row-${task.id}`}
      className="flex animate-fade-up items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 transition hover:shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={() => moveTask(task.id, done ? (task.previousStatus ?? 'backlog') : 'done')}
        aria-label={done ? `Marcar ${task.title} como não concluída` : `Marcar ${task.title} como concluída`}
        aria-pressed={done}
        className="shrink-0 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
      >
        {done ? <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" /> : <Circle size={20} />}
      </button>
      <button
        type="button"
        onClick={() => openEditTask(task.id)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Editar tarefa ${task.title}`}
      >
        <span className={`block truncate text-sm font-semibold ${done ? 'text-zinc-600 line-through dark:text-zinc-400' : ''}`}>
          {task.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-zinc-600 dark:text-zinc-400">
          {projectName ? `${projectName} · ` : ''}
          {task.dueDate ? toDateOnly(task.dueDate) : 'Sem prazo'}
          {overdue ? ' · Atrasada' : ''}
          {tagNames.length > 0 ? ` · #${tagNames.slice(0, 2).join(' #')}` : ''}
        </span>
      </button>
      <PriorityBadge value={task.priority} />
    </li>
  );
}
