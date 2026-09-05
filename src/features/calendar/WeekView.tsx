import { buildDayBuckets, getWeekDays, toDateOnlyString, weekdayHeaders } from '../../services/calendar';
import type { Task } from '../../types';
import { CalendarDayCell, type DayCellColors } from './CalendarDayCell';

/** 7 colunas (seg–dom) com rolagem horizontal no mobile. */
export function WeekView({
  cursor,
  tasks,
  colors,
  onOpenDay,
  onNewTask,
}: {
  cursor: Date;
  tasks: Task[];
  colors: Map<string, DayCellColors>;
  onOpenDay: (iso: string) => void;
  onNewTask: (iso: string) => void;
}): React.JSX.Element {
  const days = getWeekDays(cursor);
  const buckets = buildDayBuckets(tasks, days);
  const headers = weekdayHeaders();

  return (
    <div
      role="region"
      aria-label="Calendário semanal. Arraste tarefas entre dias para remarcar."
      className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0"
    >
      <div className="grid min-w-[720px] grid-cols-7 gap-1.5">
        {buckets.map((b, i) => (
          <div key={b.iso}>
            <p
              aria-hidden
              className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              {headers[i]}
            </p>
            <CalendarDayCell
              bucket={b}
              colors={colors}
              maxVisible={4}
              onOpenDay={onOpenDay}
              onNewTask={onNewTask}
              minHeight="min-h-40 sm:min-h-52"
            />
            <span className="sr-only">{toDateOnlyString(b.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
