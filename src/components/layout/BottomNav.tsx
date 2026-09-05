import { CalendarDays, Home, KanbanSquare, Plus } from 'lucide-react';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';

export function BottomNav(): React.JSX.Element {
  const view = useUIStore((s) => s.view);
  const goDashboard = useUIStore((s) => s.goDashboard);
  const goCalendar = useUIStore((s) => s.goCalendar);
  const openProject = useUIStore((s) => s.openProject);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const projects = useBoardStore((s) => s.projects);

  const currentProjectId = view.kind === 'project' ? view.projectId : projects[0]?.id;

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="grid grid-cols-4">
        <button
          type="button"
          onClick={goDashboard}
          aria-current={view.kind === 'dashboard' ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold',
            view.kind === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          <Home size={20} aria-hidden />
          Início
        </button>
        <button
          type="button"
          disabled={!currentProjectId}
          onClick={() => currentProjectId && openProject(currentProjectId)}
          className={cn(
            'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold disabled:opacity-40',
            view.kind === 'project' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          <KanbanSquare size={20} aria-hidden />
          Quadro
        </button>
        <button
          type="button"
          onClick={goCalendar}
          aria-current={view.kind === 'calendar' ? 'page' : undefined}
          className={cn(
            'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold',
            view.kind === 'calendar' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          <CalendarDays size={20} aria-hidden />
          Agenda
        </button>
        <button
          type="button"
          onClick={() => openNewTask(view.kind === 'project' ? view.projectId : null, null)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
        >
          <Plus size={20} aria-hidden />
          Nova
        </button>
      </div>
    </nav>
  );
}
