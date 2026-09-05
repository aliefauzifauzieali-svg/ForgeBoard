import { Plus } from 'lucide-react';
import { buildDayBuckets, toDateOnlyString } from '../../services/calendar';
import type { Task } from '../../types';
import { CalendarDayCell, type DayCellColors } from './CalendarDayCell';

/** Um dia em detalhe: todas as tarefas com prazo naquele dia. */
export function DayView({
  cursor,
  tasks,
  colors,
  onNewTask,
}: {
  cursor: Date;
  tasks: Task[];
  colors: Map<string, DayCellColors>;
  onNewTask: (iso: string) => void;
}): React.JSX.Element {
  const [bucket] = buildDayBuckets(tasks, [cursor]);
  if (!bucket) return <p className="text-sm text-zinc-500">Dia inválido.</p>;
  const iso = toDateOnlyString(cursor);

  return (
    <div className="space-y-3">
      <CalendarDayCell bucket={bucket} colors={colors} onNewTask={onNewTask} minHeight="min-h-24" detailed />
      {bucket.tasks.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-bold">Nenhuma tarefa neste dia</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Arraste uma tarefa para cá ou crie uma com este prazo.
          </p>
          <button type="button" className="btn-primary mt-4" onClick={() => onNewTask(iso)}>
            <Plus size={16} aria-hidden /> Criar tarefa neste dia
          </button>
        </div>
      ) : null}
    </div>
  );
}
