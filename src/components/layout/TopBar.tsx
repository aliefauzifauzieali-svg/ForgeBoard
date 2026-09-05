import { Command, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import type { RefObject } from 'react';
import { useBoardStore } from '../../stores/useBoardStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUIStore } from '../../stores/useUIStore';

export function TopBar({
  searchRef,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
}): React.JSX.Element {
  const filters = useUIStore((s) => s.filters);
  const setFilters = useUIStore((s) => s.setFilters);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const openNewProject = useUIStore((s) => s.openNewProject);
  const view = useUIStore((s) => s.view);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const resolved = useThemeStore((s) => s.resolved);
  const tasks = useBoardStore((s) => s.tasks);

  const openCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="icon-btn lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <label htmlFor="global-search" className="sr-only">
            Pesquisar tarefas por título, descrição ou tag (atalho /)
          </label>
          <input
            ref={searchRef}
            id="global-search"
            type="search"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Pesquisar tarefas…  ( / )"
            className="input !pl-9"
          />
        </div>

        <span className="ml-auto hidden items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 md:inline-flex dark:bg-zinc-900 dark:text-zinc-300">
          {openCount} em aberto
        </span>

        <button
          type="button"
          className="icon-btn"
          aria-label="Abrir paleta de comandos e busca global (Ctrl+K)"
          title="Paleta de comandos (Ctrl+K)"
          onClick={() => setPaletteOpen(true)}
        >
          <Command size={18} />
        </button>

        <button
          type="button"
          className="icon-btn"
          aria-label={resolved === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          title={`Tema: ${preference}`}
          onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          className="btn-ghost hidden !py-2 sm:inline-flex"
          onClick={openNewProject}
        >
          <Plus size={15} aria-hidden /> Projeto
        </button>
        <button
          type="button"
          className="btn-primary !py-2"
          onClick={() =>
            openNewTask(view.kind === 'project' ? view.projectId : null, null)
          }
        >
          <Plus size={15} aria-hidden />
          <span className="hidden sm:inline">Nova tarefa</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>
    </header>
  );
}
