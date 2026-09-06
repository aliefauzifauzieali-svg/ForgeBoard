import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Copy, Pencil, Repeat, Trash2 } from 'lucide-react';
import type { Task } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { isOverdue, toDateOnly } from '../../utils/date';
import { PriorityBadge, StatusBadge, TagChip } from '../ui/Badges';

const ORDER: Task['status'][] = ['backlog', 'in-progress', 'done'];

export function TaskCard({ task, projectColor }: { task: Task; projectColor?: string }): React.JSX.Element {
  const openEditTask = useUIStore((s) => s.openEditTask);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const duplicateTask = useBoardStore((s) => s.duplicateTask);
  const moveTask = useBoardStore((s) => s.moveTask);
  const allTags = useBoardStore((s) => s.tags);

  const overdue = isOverdue(task.dueDate, task.status);
  const idx = ORDER.indexOf(task.status);

  const onDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('text/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article
      data-testid={`task-card-${task.id}`}
      draggable
      onDragStart={onDragStart}
      aria-label={`Tarefa ${task.title}. Status ${task.status}. Prioridade ${task.priority}.`}
      className="group cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:-translate-y-px hover:shadow-card focus-visible:ring-2 active:cursor-grabbing dark:border-zinc-700/80 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-2">
        {projectColor ? (
          <span
            aria-hidden
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: projectColor }}
          />
        ) : null}
        <h4 className="min-w-0 flex-1 text-sm font-semibold leading-snug">
          <button
            type="button"
            onClick={() => openEditTask(task.id)}
            aria-label={`Abrir tarefa ${task.title} para edição`}
            className="rounded text-left hover:underline"
          >
            {task.title}
          </button>
        </h4>
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
          role="toolbar"
          aria-label={`Ações da tarefa ${task.title}`}
        >
          <button
            type="button"
            className="icon-btn !h-7 !w-7"
            aria-label={`Editar tarefa ${task.title}`}
            onClick={() => openEditTask(task.id)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="icon-btn !h-7 !w-7"
            aria-label={`Duplicar tarefa ${task.title}`}
            onClick={() => duplicateTask(task.id)}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            className="icon-btn !h-7 !w-7 hover:!text-red-600"
            aria-label={`Excluir tarefa ${task.title}`}
            onClick={() =>
              askConfirm({
                title: 'Excluir tarefa',
                description: `“${task.title}” será excluída permanentemente.`,
                confirmLabel: 'Excluir',
                action: () => deleteTask(task.id),
              })
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {task.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">{task.description}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={task.priority} />
        <StatusBadge value={task.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
        <span
          className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}
        >
          {overdue ? <AlertCircle size={12} aria-hidden /> : <CalendarDays size={12} aria-hidden />}
          {task.dueDate ? toDateOnly(task.dueDate) : 'Sem prazo'}
          {overdue ? ' · Atrasada' : ''}
        </span>
        {task.recurrence ? (
          <span className="inline-flex items-center gap-1" title={`Repete: ${task.recurrence.kind === 'custom' ? `a cada ${task.recurrence.intervalDays} dias` : task.recurrence.kind}`}>
            <Repeat size={12} aria-hidden />
            <span className="sr-only">Tarefa recorrente</span>
            Recorrente
          </span>
        ) : null}
        {task.tagIds.slice(0, 3).map((id) => {
          const tag = allTags.find((t) => t.id === id);
          if (!tag) return null;
          return <TagChip key={id} label={tag.name} color={tag.color} />;
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-800">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Mover:</span>
        <span className="flex gap-1">
          <button
            type="button"
            disabled={idx <= 0}
            aria-label={`Mover ${task.title} para a coluna anterior`}
            onClick={() => idx > 0 && moveTask(task.id, ORDER[idx - 1]!)}
            className="icon-btn !h-7 !w-7 disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            disabled={idx >= ORDER.length - 1}
            aria-label={`Mover ${task.title} para a próxima coluna`}
            onClick={() => idx < ORDER.length - 1 && moveTask(task.id, ORDER[idx + 1]!)}
            className="icon-btn !h-7 !w-7 disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </span>
      </div>
    </article>
  );
}
