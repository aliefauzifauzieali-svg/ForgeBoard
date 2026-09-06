import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { TaskFiltersBar } from '../../components/tasks/TaskFiltersBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/Stats';
import { TASK_STATUSES } from '../../types';
import { projectProgress } from '../../services/boardStats';
import { queryTasks } from '../../services/taskQuery';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { isOverdue } from '../../utils/date';

export function ProjectView({ projectId }: { projectId: string }): React.JSX.Element {
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const tags = useBoardStore((s) => s.tags);
  const deleteProject = useBoardStore((s) => s.deleteProject);
  const goDashboard = useUIStore((s) => s.goDashboard);
  const openEditProject = useUIStore((s) => s.openEditProject);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const filters = useUIStore((s) => s.filters);
  const sortKey = useUIStore((s) => s.sortKey);
  const sortDir = useUIStore((s) => s.sortDir);
  const isTouch = useIsTouchDevice();

  const project = projects.find((p) => p.id === projectId);

  const scoped = useMemo(() => {
    if (!project) return [];
    const tagById = new Map(tags.map((t) => [t.id, t.name] as const));
    return queryTasks(
      tasks.filter((t) => t.projectId === project.id),
      { ...filters, projectId: 'all' },
      sortKey,
      sortDir,
      tagById,
    );
  }, [tasks, project, filters, sortKey, sortDir, tags]);

  const visibleStatuses = useMemo(() => {
    if (filters.statuses.length === 0) return TASK_STATUSES;
    return TASK_STATUSES.filter((s) => filters.statuses.includes(s));
  }, [filters.statuses]);

  if (!project) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Projeto não encontrado"
        description="Ele pode ter sido excluído. Volte ao dashboard."
        action={
          <button type="button" className="btn-primary" onClick={goDashboard}>
            Voltar ao dashboard
          </button>
        }
      />
    );
  }

  const progress = projectProgress(project.id, tasks);
  const mine = tasks.filter((t) => t.projectId === project.id);
  const overdue = mine.filter((t) => isOverdue(t.dueDate, t.status)).length;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={goDashboard}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={14} aria-hidden /> Dashboard
      </button>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight">{project.name}</h1>
              {project.description ? (
                <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                {mine.length} {mine.length === 1 ? 'tarefa' : 'tarefas'}
                {overdue > 0 ? ` · ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ' · sem atrasos'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !py-2" onClick={() => openEditProject(project.id)}>
              <Pencil size={14} aria-hidden /> Editar
            </button>
            <button
              type="button"
              className="btn-ghost !py-2 hover:!text-red-600"
              onClick={() =>
                askConfirm({
                  title: 'Excluir projeto',
                  description: `“${project.name}” e suas ${mine.length} tarefas serão excluídos.`,
                  confirmLabel: 'Excluir',
                  action: () => {
                    deleteProject(project.id);
                    goDashboard();
                  },
                })
              }
            >
              <Trash2 size={14} aria-hidden /> Excluir
            </button>
            <button type="button" className="btn-primary !py-2" onClick={() => openNewTask(project.id, null)}>
              <Plus size={15} aria-hidden /> Nova tarefa
            </button>
          </div>
        </div>
        <div className="mt-4 max-w-xl">
          <div className="mb-1.5 flex justify-between text-xs font-semibold">
            <span className="text-zinc-600 dark:text-zinc-400">Progresso</span>
            <span className="tabular-nums">
              {progress.done}/{progress.total} · {progress.percent}%
            </span>
          </div>
          <ProgressBar percent={progress.percent} color={project.color} label={`Progresso de ${project.name}`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Quadro Kanban</h2>
        <TaskFiltersBar />
      </div>

      {mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Quadro vazio — crie a primeira tarefa
          {isTouch ? (
            <> usando o <span aria-hidden>+</span> de uma coluna.</>
          ) : (
            <>
              {' '}(atalho{' '}
              <kbd className="rounded bg-zinc-200 px-1 font-bold dark:bg-zinc-800">N</kbd>) ou use o{' '}
              <span aria-hidden>+</span> de uma coluna.
            </>
          )}{' '}
          Arraste cartões entre as colunas.
        </p>
      ) : null}
      <KanbanBoard
        projectId={project.id}
        projectColor={project.color}
        tasks={scoped.filter((t) => visibleStatuses.includes(t.status))}
      />
    </div>
  );
}
