import { Suspense, use, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, X } from 'lucide-react';
import { ActivityBars } from '../../components/charts/ActivityBars';
import { ProgressLines } from '../../components/charts/ProgressLines';
import { StatCard } from '../../components/ui/Stats';
import { queryEventsCached, type ActivityEvent } from '../../storage/activity';
import {
  activityByBucket,
  leadTimeFromEvents,
  projectProgressSeries,
  type TimeBucket,
} from '../../services/activityStats';
import { boardStats } from '../../services/boardStats';
import { toDateOnlyString } from '../../services/calendar';
import { toDateTime } from '../../utils/date';
import { useBoardStore } from '../../stores/useBoardStore';
import { cn } from '../../utils/core';

type Period = '7' | '30' | '90' | 'custom';

const EVENT_LABEL: Record<ActivityEvent['type'], string> = {
  'task.created': 'tarefa criada',
  'task.updated': 'tarefa editada',
  'task.deleted': 'tarefa excluída',
  'task.moved': 'tarefa movida',
  'task.completed': 'tarefa concluída',
  'task.reopened': 'tarefa reaberta',
  'project.created': 'projeto criado',
  'project.updated': 'projeto editado',
  'project.deleted': 'projeto excluído',
  'tag.created': 'etiqueta criada',
  'tag.updated': 'etiqueta editada',
  'tag.deleted': 'etiqueta excluída',
};

function eventTitle(e: ActivityEvent): string {
  return e.meta?.title ?? e.meta?.name ?? e.entityId;
}

function rangeFor(period: Period, from: string, to: string): { since: string; until: string; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period !== 'custom') {
    const n = Number(period);
    const since = new Date(today);
    since.setDate(since.getDate() - (n - 1));
    const until = new Date(today);
    until.setDate(until.getDate() + 1);
    return { since: since.toISOString(), until: until.toISOString(), days: n };
  }
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const safeStart = Number.isNaN(start.getTime()) ? new Date(today) : start;
  const safeEnd = Number.isNaN(end.getTime()) || end < safeStart ? safeStart : end;
  const until = new Date(safeEnd);
  until.setDate(until.getDate() + 1);
  const days = Math.min(366, Math.max(1, Math.round((until.getTime() - safeStart.getTime()) / 86_400_000)));
  return { since: safeStart.toISOString(), until: until.toISOString(), days };
}

function StatsView(): React.JSX.Element {
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const tags = useBoardStore((s) => s.tags);

  const [projectId, setProjectId] = useState('all');
  const [tagId, setTagId] = useState('all');
  const [period, setPeriod] = useState<Period>('30');
  const [from, setFrom] = useState(() => toDateOnlyString(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => toDateOnlyString(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const range = useMemo(() => rangeFor(period, from, to), [period, from, to]);
  const query = useMemo(
    () => ({
      projectId: projectId === 'all' ? undefined : projectId,
      tagId: tagId === 'all' ? undefined : tagId,
      since: range.since,
      until: range.until,
      limit: 2000,
    }),
    [projectId, tagId, range],
  );
  const events = use(queryEventsCached(query));

  const bucket: TimeBucket = range.days <= 31 ? 'day' : 'week';
  const buckets = useMemo(
    () => activityByBucket(events, bucket, bucket === 'day' ? range.days : Math.ceil(range.days / 7)),
    [events, bucket, range.days],
  );
  const visibleProjects = useMemo(
    () => (projectId === 'all' ? projects : projects.filter((p) => p.id === projectId)),
    [projects, projectId],
  );
  const series = useMemo(
    () => projectProgressSeries(events, visibleProjects, Math.min(range.days, 90)),
    [events, visibleProjects, range.days],
  );
  const lead = useMemo(() => leadTimeFromEvents(events), [events]);
  const stats = useMemo(() => boardStats(projects, tasks), [projects, tasks]);
  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name] as const)), [projects]);
  const rates = buckets.map((b) => b.rate).filter((r): r is number => r !== null);
  const avgRate = rates.length === 0 ? null : Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

  const tableRows = useMemo(() => {
    const list = selectedDay
      ? events.filter((e) => toDateOnlyString(new Date(e.at)) === selectedDay)
      : events;
    return list.slice(0, 10);
  }, [events, selectedDay]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <BarChart3 size={24} aria-hidden className="text-[var(--accent)] dark:text-[var(--accent-bright)]" />
          Estatísticas
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Métricas do registro de atividades (desde a Fase 6; importações antigas não geram eventos).
        </p>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<CalendarDays size={20} />} label="Tarefas" value={stats.totalTasks} />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Concluídas"
          value={stats.doneTasks}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Atrasadas"
          value={stats.overdueTasks}
          accent="bg-red-500/10 text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Projetos ativos"
          value={projects.filter((p) => tasks.some((t) => t.projectId === p.id && t.status !== 'done')).length}
          accent="bg-sky-600/10 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Etiquetas"
          value={tags.length}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={<CalendarDays size={20} />}
          label="Lead time"
          value={lead.averageDays === null ? '—' : `${lead.averageDays}d`}
          hint={`${lead.completed} conclusões no período`}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </section>

      <section aria-label="Filtros" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="stats-project">Filtrar por projeto</label>
          <select id="stats-project" className="input !w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="all">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="stats-tag">Filtrar por etiqueta</label>
          <select id="stats-tag" className="input !w-auto" value={tagId} onChange={(e) => setTagId(e.target.value)}>
            <option value="all">Todas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label" id="stats-period-label">Período</span>
          <div role="group" aria-labelledby="stats-period-label" className="flex gap-1.5">
            {(['7', '30', '90', 'custom'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  period === p
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
                )}
              >
                {p === 'custom' ? 'Outro' : `${p}d`}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' ? (
          <>
            <div>
              <label className="label" htmlFor="stats-from">De</label>
              <input id="stats-from" type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="stats-to">Até</label>
              <input id="stats-to" type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : null}
        {selectedDay ? (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--accent-dark)] dark:text-[var(--accent-bright)]"
          >
            Dia {selectedDay.split('-').reverse().join('/')} <X size={13} aria-hidden /> Limpar
          </button>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section aria-labelledby="throughput-heading" className="card p-4 lg:col-span-3">
          <h2 id="throughput-heading" className="text-sm font-bold">
            Throughput — concluídas por {bucket === 'day' ? 'dia' : 'semana'}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Clique numa barra para filtrar a tabela. Taxa média no período:{' '}
            <strong className="tabular-nums">{avgRate === null ? '—' : `${avgRate}%`}</strong>
          </p>
          <div className="mt-2">
            <ActivityBars
              data={buckets.map((b) => ({ iso: b.key, label: b.label, count: b.completed }))}
              total={buckets.reduce((a, b) => a + b.completed, 0)}
              selectedIso={selectedDay}
              onSelect={(iso) => setSelectedDay((cur) => (cur === iso ? null : iso))}
            />
          </div>
        </section>
        <section aria-labelledby="evolution-heading" className="card p-4 lg:col-span-2">
          <h2 id="evolution-heading" className="text-sm font-bold">Evolução por projeto</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Conclusões acumuladas</p>
          <div className="mt-2">
            <ProgressLines series={series} />
          </div>
        </section>
      </div>

      <section aria-labelledby="recent-heading" className="card p-4">
        <h2 id="recent-heading" className="text-sm font-bold">
          Atividade recente{selectedDay ? ' (dia filtrado)' : ''}
        </h2>
        {tableRows.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Sem eventos para os filtros atuais. Ações no app aparecem aqui.
          </p>
        ) : (
          <div role="region" aria-label="Tabela de atividades" className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th scope="col" className="py-2 pr-3 font-bold">Evento</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Item</th>
                  <th scope="col" className="py-2 pr-3 font-bold">Projeto</th>
                  <th scope="col" className="py-2 font-bold">Quando</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-3 font-semibold">{EVENT_LABEL[e.type]}</td>
                    <td className="max-w-56 truncate py-2 pr-3">{eventTitle(e)}</td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                      {e.projectId ? (projectNames.get(e.projectId) ?? '—') : '—'}
                    </td>
                    <td className="whitespace-nowrap py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                      <time dateTime={e.at}>{toDateTime(e.at)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function StatsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div aria-busy className="space-y-4" aria-label="Carregando estatísticas">
          <div className="card skeleton p-4">
            <p className="text-sm text-zinc-500">Carregando estatísticas…</p>
          </div>
        </div>
      }
    >
      <StatsView />
    </Suspense>
  );
}
