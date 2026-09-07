import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  shiftCursor,
  tasksWithoutDueDate,
  toDateOnlyString,
  type CalendarMode,
} from '../../services/calendar';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

const MODES: Array<{ id: CalendarMode; label: string }> = [
  { id: 'month', label: 'Mês' },
  { id: 'week', label: 'Semana' },
  { id: 'day', label: 'Dia' },
];

const MODE_NOUN: Record<CalendarMode, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
};

const NEXT_LABEL: Record<CalendarMode, string> = {
  month: 'Próximo mês',
  week: 'Próxima semana',
  day: 'Próximo dia',
};

/**
 * Calendário global de prazos. Lê e escreve as MESMAS tarefas do Kanban
 * (via `useBoardStore`), então a sincronização é automática nos dois sentidos.
 */
export function CalendarView(): React.JSX.Element {
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const goDashboard = useUIStore((s) => s.goDashboard);

  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(() => new Date());

  const colors = useMemo(
    () => new Map(projects.map((p) => [p.id, { color: p.color, name: p.name }] as const)),
    [projects],
  );
  const undated = useMemo(() => tasksWithoutDueDate(tasks), [tasks]);

  const title =
    mode === 'month' ? formatMonthTitle(cursor) : mode === 'week' ? formatWeekTitle(cursor) : formatDayTitle(cursor);

  const openDay = (iso: string): void => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    setCursor(new Date(y, m - 1, d));
    setMode('day');
  };

  return (
    <div className="space-y-5" data-testid="calendar-view">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CalendarDays size={24} aria-hidden className="text-[var(--accent)] dark:text-[var(--accent-bright)]" />
            Calendário
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Prazos das tarefas. Arraste entre dias para remarcar.
          </p>
        </div>
        <div
          role="group"
          aria-label="Modo de visualização"
          className="flex rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                mode === m.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold tabular-nums">{title}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            aria-label={`${MODE_NOUN[mode]} anterior`}
            onClick={() => setCursor((c) => shiftCursor(c, mode, -1))}
          >
            <ChevronLeft size={15} aria-hidden /> Anterior
          </button>
          <button
            type="button"
            className="btn-ghost !px-3 !py-1.5 text-xs"
            onClick={() => setCursor(new Date())}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
            aria-label={NEXT_LABEL[mode]}
            onClick={() => setCursor((c) => shiftCursor(c, mode, 1))}
          >
            Próximo <ChevronRight size={15} aria-hidden />
          </button>
        </div>
      </div>

      <div key={`${mode}-${toDateOnlyString(cursor)}`} className="animate-fade-up">
        {mode === 'month' ? (
        <MonthView cursor={cursor} tasks={tasks} colors={colors} onOpenDay={openDay} onNewTask={(iso) => openNewTask(null, 'backlog', iso)} />
      ) : mode === 'week' ? (
        <WeekView cursor={cursor} tasks={tasks} colors={colors} onOpenDay={openDay} onNewTask={(iso) => openNewTask(null, 'backlog', iso)} />
      ) : (
        <DayView cursor={cursor} tasks={tasks} colors={colors} onNewTask={(iso) => openNewTask(null, 'backlog', iso)} />
        )}
      </div>

      {undated.length > 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-center text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {undated.length} {undated.length === 1 ? 'tarefa sem prazo' : 'tarefas sem prazo'} não
          aparece{undated.length === 1 ? '' : 'm'} aqui.{' '}
          <button
            type="button"
            className="font-bold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
            onClick={goDashboard}
          >
            Ver no dashboard
          </button>
        </p>
      ) : null}
    </div>
  );
}
