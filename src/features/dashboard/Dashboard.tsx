import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Inbox,
  ListChecks,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import { useMemo } from 'react';
import { boardStats, overdueTasks, recentTasks } from '../../services/boardStats';
import { completionsPerDay, leadTimeStats, priorityDistribution } from '../../services/stats';
import { queryTasks } from '../../services/taskQuery';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { ActivityBars } from '../../components/charts/ActivityBars';
import { PriorityDonut } from '../../components/charts/PriorityDonut';
import { FocusTimer } from '../focus/FocusTimer';
import { TodayWidget } from './TodayWidget';
import { QuickNotes } from './QuickNotes';
import { TaskFiltersBar } from '../../components/tasks/TaskFiltersBar';
import { TaskRow } from '../../components/tasks/TaskRow';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/Stats';

export function Dashboard(): React.JSX.Element {
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const tags = useBoardStore((s) => s.tags);
  const seedSample = useBoardStore((s) => s.seedSample);
  const openNewProject = useUIStore((s) => s.openNewProject);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const filters = useUIStore((s) => s.filters);
  const sortKey = useUIStore((s) => s.sortKey);
  const sortDir = useUIStore((s) => s.sortDir);

  const stats = useMemo(() => boardStats(projects, tasks), [projects, tasks]);
  const activity = useMemo(() => completionsPerDay(tasks, 14), [tasks]);
  const dist = useMemo(() => priorityDistribution(tasks), [tasks]);
  const lead = useMemo(() => leadTimeStats(tasks), [tasks]);
  const overdue = useMemo(() => overdueTasks(tasks).slice(0, 5), [tasks]);
  const recent = useMemo(() => recentTasks(tasks, 5), [tasks]);
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t.name] as const)), [tags]);
  const filteredTotal = useMemo(
    () => queryTasks(tasks, filters, sortKey, sortDir, tagById),
    [tasks, filters, sortKey, sortDir, tagById],
  );
  const filtered = useMemo(() => filteredTotal.slice(0, 30), [filteredTotal]);
  const projectNameOf = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name] as const));
    return (id: string): string | undefined => map.get(id);
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo ao ForgeBoard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Seu dashboard pessoal de projetos e tarefas — tudo salvo no navegador.
          </p>
        </div>
        <EmptyState
          icon={FolderKanban}
          title="Crie seu primeiro projeto"
          description="Projetos agrupam tarefas em quadros Kanban com Backlog, Em andamento e Concluído. Pressione P para começar."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={openNewProject}>
                <Plus size={16} aria-hidden /> Criar projeto
              </button>
              <button type="button" className="btn-ghost" onClick={seedSample}>
                <Sparkles size={16} aria-hidden /> Carregar exemplo
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Visão geral dos seus projetos e tarefas.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={openNewProject}>
            <Plus size={15} aria-hidden /> Projeto
          </button>
          <button type="button" className="btn-primary" onClick={() => openNewTask(null, null)}>
            <Plus size={15} aria-hidden /> Tarefa
          </button>
        </div>
      </div>

      <section aria-label="Estatísticas gerais" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 stagger">
        <StatCard icon={<FolderKanban size={20} />} label="Projetos" value={stats.totalProjects} />
        <StatCard
          icon={<Inbox size={20} />}
          label="Tarefas"
          value={stats.totalTasks}
          accent="bg-sky-600/10 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={<Clock3 size={20} />}
          label="Em aberto"
          value={stats.openTasks}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Concluídas"
          value={stats.doneTasks}
          spark={activity.map((d) => d.count)}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Atrasadas"
          value={stats.overdueTasks}
          hint={stats.overdueTasks > 0 ? 'Exigem atenção' : 'Tudo em dia'}
          accent="bg-red-500/10 text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Conclusão"
          value={`${stats.completionRate}%`}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </section>

      <section aria-labelledby="activity-heading">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="activity-heading" className="text-base font-bold">
            Atividade
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Lead time médio:{' '}
            <strong className="tabular-nums">{lead.averageDays === null ? '—' : `${lead.averageDays}d`}</strong>
            {' · '}
            Taxa de conclusão: <strong className="tabular-nums">{stats.completionRate}%</strong>
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="card p-4 lg:col-span-3">
            <h3 className="text-sm font-bold">Conclusões por dia</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Últimos 14 dias</p>
            <div className="mt-2">
              <ActivityBars data={activity} total={activity.reduce((a, b) => a + b.count, 0)} />
            </div>
          </div>
          <div className="card p-4 lg:col-span-2">
            <h3 className="text-sm font-bold">Por prioridade</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Distribuição atual</p>
            <div className="mt-2">
              <PriorityDonut items={dist} />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="projects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="projects-heading" className="text-base font-bold">
            Projetos
          </h2>
          <button
            type="button"
            onClick={openNewProject}
            className="text-xs font-semibold text-[var(--accent)] hover:underline dark:text-[var(--accent-bright)]"
          >
            + Novo projeto
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <TodayWidget projectNameOf={projectNameOf} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="overdue-heading" className="card min-w-0 p-4">
          <h2 id="overdue-heading" className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle size={16} className="text-red-500" aria-hidden />
            Tarefas atrasadas
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
              {overdue.length}
            </span>
          </h2>
          {overdue.length === 0 ? (
            <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Nenhuma tarefa atrasada. Bom ritmo!
            </p>
          ) : (
            <ul className="mt-3 space-y-2 stagger">
              {overdue.map((t) => (
                <TaskRow key={t.id} task={t} projectName={projectNameOf(t.projectId)} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-heading" className="card min-w-0 p-4">
          <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-bold">
            <Clock3 size={16} className="text-[var(--accent)]" aria-hidden />
            Tarefas recentes
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">Nenhuma tarefa ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2 stagger">
              {recent.map((t) => (
                <TaskRow key={t.id} task={t} projectName={projectNameOf(t.projectId)} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FocusTimer />
        <QuickNotes />
      </div>

      <section aria-labelledby="all-tasks-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="all-tasks-heading" className="flex items-center gap-2 text-base font-bold">
            <ListChecks size={18} aria-hidden />
            Todas as tarefas
            <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
              {filteredTotal.length}
            </span>
          </h2>
          <TaskFiltersBar />
        </div>
        {filteredTotal.length > 30 ? (
          <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
            Mostrando as 30 primeiras de {filteredTotal.length}. Refine a busca ou os filtros.
          </p>
        ) : null}
        {filtered.length === 0 ? (
          <p className="card p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Nenhuma tarefa corresponde aos filtros. Ajuste a busca ou limpe os filtros.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2 stagger">
            {filtered.map((t) => (
              <TaskRow key={t.id} task={t} projectName={projectNameOf(t.projectId)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
