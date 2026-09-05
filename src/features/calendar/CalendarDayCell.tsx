import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toDateOnlyString, type DayBucket } from '../../services/calendar';
import { useBoardStore } from '../../stores/useBoardStore';
import { cn } from '../../utils/core';
import { CalendarTaskChip } from './CalendarTaskChip';

export interface DayCellColors {
  color?: string;
  name?: string;
}

/**
 * Um dia do calendário: alvo de drop (remarca o prazo), lista tarefas e
 * oferece criação com a data preenchida. Reusado no mês, semana e dia.
 */
export function CalendarDayCell({
  bucket,
  colors,
  maxVisible,
  onOpenDay,
  onNewTask,
  minHeight,
  detailed,
}: {
  bucket: DayBucket;
  colors: Map<string, DayCellColors>;
  maxVisible?: number;
  onOpenDay?: (iso: string) => void;
  onNewTask: (iso: string) => void;
  minHeight?: string;
  detailed?: boolean;
}): React.JSX.Element {
  const updateTask = useBoardStore((s) => s.updateTask);
  const [over, setOver] = useState(false);

  const visible = maxVisible === undefined ? bucket.tasks : bucket.tasks.slice(0, maxVisible);
  const hidden = bucket.tasks.length - visible.length;

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/task-id');
    if (!id) return;
    const current = useBoardStore.getState().tasks.find((t) => t.id === id);
    if (!current || current.dueDate === bucket.iso) return;
    updateTask(id, { dueDate: bucket.iso });
  };

  return (
    <div
      data-testid={`cal-day-${bucket.iso}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setOver(false);
      }}
      onDrop={onDrop}
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-1.5 transition sm:p-2',
        minHeight ?? 'min-h-16 sm:min-h-24',
        bucket.isToday
          ? 'border-indigo-500/60 bg-indigo-600/[0.04] dark:bg-indigo-500/10'
          : bucket.isOutside
            ? 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/30'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60',
        over && 'border-indigo-500 ring-2 ring-indigo-500/40',
      )}
    >
      <div className="flex items-center justify-between gap-1 px-0.5">
        <time
          dateTime={bucket.iso}
          aria-label={`${bucket.date.getDate()}${bucket.isToday ? ', hoje' : ''}`}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
            bucket.isToday
              ? 'bg-indigo-600 text-white'
              : bucket.isOutside
                ? 'text-zinc-500 dark:text-zinc-400'
                : 'text-zinc-600 dark:text-zinc-300',
          )}
        >
          {bucket.date.getDate()}
        </time>
        <button
          type="button"
          onClick={() => onNewTask(bucket.iso)}
          aria-label={`Criar tarefa em ${toDateOnlyString(bucket.date)}`}
          title={`Criar tarefa em ${toDateOnlyString(bucket.date)}`}
          className="icon-btn !h-6 !w-6"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {visible.map((t) => {
          const meta = colors.get(t.projectId);
          return (
            <CalendarTaskChip
              key={t.id}
              task={t}
              projectColor={meta?.color}
              projectName={meta?.name}
              detailed={detailed}
            />
          );
        })}
      </div>

      {hidden > 0 && onOpenDay ? (
        <button
          type="button"
          onClick={() => onOpenDay(bucket.iso)}
          className="rounded-md px-1 py-0.5 text-left text-[11px] font-bold text-indigo-600 hover:bg-indigo-600/10 dark:text-indigo-400"
        >
          +{hidden} {hidden === 1 ? 'tarefa' : 'tarefas'}
        </button>
      ) : null}
    </div>
  );
}
