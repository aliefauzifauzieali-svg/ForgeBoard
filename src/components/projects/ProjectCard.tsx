import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import { projectProgress } from '../../services/boardStats';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { isOverdue } from '../../utils/date';
import { ProgressBar } from '../ui/Stats';

export function ProjectCard({ project }: { project: Project }): React.JSX.Element {
  const tasks = useBoardStore((s) => s.tasks);
  const openProject = useUIStore((s) => s.openProject);
  const openEditProject = useUIStore((s) => s.openEditProject);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const deleteProject = useBoardStore((s) => s.deleteProject);

  const mine = tasks.filter((t) => t.projectId === project.id);
  const progress = projectProgress(project.id, tasks);
  const open = mine.filter((t) => t.status !== 'done').length;
  const overdue = mine.filter((t) => isOverdue(t.dueDate, t.status)).length;

  return (
    <article
      data-testid={`project-card-${project.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop animate-fade-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="h-10 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold">{project.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {mine.length} {mine.length === 1 ? 'tarefa' : 'tarefas'} · {open} em aberto
              {overdue > 0 ? ` · ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Editar projeto ${project.name}`}
            onClick={() => openEditProject(project.id)}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="icon-btn hover:!text-red-600"
            aria-label={`Excluir projeto ${project.name}`}
            onClick={() =>
              askConfirm({
                title: 'Excluir projeto',
                description: `“${project.name}” e suas ${mine.length} tarefas serão excluídos permanentemente.`,
                confirmLabel: 'Excluir',
                action: () => deleteProject(project.id),
              })
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {project.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>
      ) : null}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-zinc-600 dark:text-zinc-400">Progresso</span>
          <span className="tabular-nums">{progress.percent}%</span>
        </div>
        <ProgressBar percent={progress.percent} color={project.color} label={`Progresso de ${project.name}: ${progress.percent}%`} />
        <p className="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
          {progress.done} de {progress.total} concluídas
        </p>
      </div>

      <button
        type="button"
        onClick={() => openProject(project.id)}
        className="btn-ghost mt-4 w-full"
        aria-label={`Abrir projeto ${project.name}`}
      >
        Abrir quadro
        <ArrowRight size={16} aria-hidden />
      </button>
    </article>
  );
}
