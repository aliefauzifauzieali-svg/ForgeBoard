import { buildDayBuckets, getMonthCells, weekdayHeaders } from '../../services/calendar';
import type { Task } from '../../types';
import { CalendarDayCell, type DayCellColors } from './CalendarDayCell';

/** Grade mensal 6×7 em tabela (cabeçalhos reais para leitores de tela). */
export function MonthView({
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
  const days = getMonthCells(cursor);
  const buckets = buildDayBuckets(tasks, days, cursor);
  const headers = weekdayHeaders();
  const weeks: typeof buckets[] = [];
  for (let i = 0; i < buckets.length; i += 7) weeks.push(buckets.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-separate" style={{ borderSpacing: 6 }}>
        <caption className="sr-only">Calendário mensal: tarefas por dia. Arraste tarefas entre dias para remarcar.</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((b) => (
                <td key={b.iso} className="w-[14.28%] align-top">
                  <CalendarDayCell
                    bucket={b}
                    colors={colors}
                    maxVisible={2}
                    onOpenDay={onOpenDay}
                    onNewTask={onNewTask}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
