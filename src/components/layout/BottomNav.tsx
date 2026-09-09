import { CalendarDays, Home, KanbanSquare, NotebookPen, Plus } from 'lucide-react';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';

export function BottomNav(): React.JSX.Element {
  const view = useUIStore((s) => s.view);
  const goDashboard = useUIStore((s) => s.goDashboard);
  const goCalendar = useUIStore((s) => s.goCalendar);
  const goNotes = useUIStore((s) => s.goNotes);
  const openProject = useUIStore((s) => s.openProject);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const projects = useBoardStore((s) => s.projects);

  const currentProjectId = view.kind === 'project' ? view.projectId : projects[0]?.id;

  const item = (active: boolean): string =>
    cn(
      'flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-[transform,color] duration-200 active:scale-95',
      active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400',
    );
  // Item ativo: pílula clara com ícone escuro (referência mobile).
  const iconWrap = (active: boolean): string =>
    cn(
      'flex items-center justify-center rounded-full px-4 py-1 transition-[background-color,transform] duration-200',
      active && 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
    );

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-zinc-200/80 bg-white/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-pop backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[rgb(30_30_35/0.8)]"
    >
      <div className="grid grid-cols-5 px-2">
        <button
          type="button"
          onClick={goDashboard}
          aria-current={view.kind === 'dashboard' ? 'page' : undefined}
          className={item(view.kind === 'dashboard')}
        >
          <span className={iconWrap(view.kind === 'dashboard')}>
            <Home size={20} aria-hidden />
          </span>
          Início
        </button>
        <button
          type="button"
          disabled={!currentProjectId}
          onClick={() => currentProjectId && openProject(currentProjectId)}
          className={cn(item(view.kind === 'project'), 'disabled:opacity-40')}
        >
          <span className={iconWrap(view.kind === 'project')}>
            <KanbanSquare size={20} aria-hidden />
          </span>
          Quadro
        </button>
        <button
          type="button"
          onClick={goCalendar}
          aria-current={view.kind === 'calendar' ? 'page' : undefined}
          className={item(view.kind === 'calendar')}
        >
          <span className={iconWrap(view.kind === 'calendar')}>
            <CalendarDays size={20} aria-hidden />
          </span>
          Agenda
        </button>
        <button
          type="button"
          onClick={goNotes}
          aria-current={view.kind === 'notes' ? 'page' : undefined}
          className={item(view.kind === 'notes')}
        >
          <span className={iconWrap(view.kind === 'notes')}>
            <NotebookPen size={20} aria-hidden />
          </span>
          Notas
        </button>
        <button
          type="button"
          onClick={() => openNewTask(view.kind === 'project' ? view.projectId : null, null)}
          className={item(false)}
        >
          <span className={iconWrap(false)}>
            <Plus size={20} aria-hidden />
          </span>
          Nova
        </button>
      </div>
    </nav>
  );
}
