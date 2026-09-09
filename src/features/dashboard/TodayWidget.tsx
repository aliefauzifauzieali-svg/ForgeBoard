import { CalendarCheck2, Lightbulb } from 'lucide-react';
import { overdueTasks, tasksDueToday } from '../../services/boardStats';
import { useBoardStore } from '../../stores/useBoardStore';
import { TaskRow } from '../../components/tasks/TaskRow';
import { useMemo } from 'react';

/**
 * Widget "Hoje": tarefas vencendo hoje + uma sugestão inteligente
 * (atrasadas têm seção própria abaixo; aqui só o insight as cita).
 * Só leitura (usa TaskRow).
 */
export function TodayWidget({ projectNameOf }: { projectNameOf: (id: string) => string | undefined }): React.JSX.Element {
  const tasks = useBoardStore((s) => s.tasks);
  const overdueCount = useMemo(() => overdueTasks(tasks).length, [tasks]);
  const today = useMemo(() => tasksDueToday(tasks).slice(0, 5), [tasks]);

  const insight =
    overdueCount > 0
      ? `Você tem ${overdueCount} ${overdueCount === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} — comece ${overdueCount === 1 ? 'por ela' : 'por elas'}.`
      : today.length > 0
        ? `Foque ${today.length === 1 ? 'na tarefa de hoje' : `nas ${today.length} tarefas de hoje`}.`
        : 'Nada vencendo — bom dia para adiantar o backlog.';

  if (overdueCount === 0 && today.length === 0) return <></>;

  return (
    <section aria-labelledby="today-heading" data-testid="today-section" className="card min-w-0 p-4">
      <h2 id="today-heading" className="flex items-center gap-2 text-sm font-bold tracking-tight">
        <CalendarCheck2 size={16} aria-hidden className="text-[var(--accent)]" />
        Hoje
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
          {today.length}
        </span>
      </h2>
      <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
        <Lightbulb size={14} aria-hidden className="mt-px shrink-0 text-[var(--accent)] dark:text-[var(--accent-bright)]" />
        {insight}
      </p>
      {today.length > 0 ? (
        <ul className="mt-3 space-y-2 stagger">
          {today.map((t) => (
            <TaskRow key={t.id} task={t} projectName={projectNameOf(t.projectId)} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">Nenhuma tarefa vence hoje.</p>
      )}
    </section>
  );
}
