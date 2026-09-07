import { useMemo, useRef, useState } from 'react';
import { CornerDownLeft, FolderKanban, Search, SquareCheckBig, type LucideIcon } from 'lucide-react';
import { searchBoard } from '../../services/globalSearch';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';
import { highlightParts } from './highlight';
import { cn } from '../../utils/core';
import { buildCommands, filterCommands } from './commands';

interface PaletteItem {
  key: string;
  section: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  disabled?: boolean;
  run: () => void;
}

/** Texto com os termos da busca destacados (`<mark>`). */
function Hi({ text, query }: { text: string; query: string }): React.JSX.Element {
  const parts = highlightParts(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] px-px text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Paleta de comandos + busca global (Ctrl/⌘+K).
 * Montada de forma estável (saída animada); a busca zera ao desmontar.
 */
export function CommandPalette(): React.JSX.Element | null {
  const open = useUIStore((s) => s.paletteOpen);
  const setOpen = useUIStore((s) => s.setPaletteOpen);
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const tags = useBoardStore((s) => s.tags);
  const openEditTask = useUIStore((s) => s.openEditTask);
  const openProject = useUIStore((s) => s.openProject);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Saída animada (mesmo padrão do Modal); ao desmontar, limpa a busca
  // para a próxima abertura começar zerada.
  const { rendered, leaving } = useDelayedUnmount(open, undefined, () => {
    setQuery('');
    setActive(0);
  });
  useFocusTrap(panelRef, rendered);

  const names = useMemo(() => new Map(projects.map((p) => [p.id, p.name] as const)), [projects]);

  const items: PaletteItem[] = useMemo(() => {
    const close =
      (fn: () => void) =>
      (): void => {
        setOpen(false);
        fn();
      };
    const q = query.trim();
    if (!q) {
      const cmds = buildCommands();
      return [
        ...cmds
          .filter((c) => !c.id.startsWith('open-'))
          .map((c) => ({
            key: c.id,
            section: 'Ações',
            label: c.label,
            sub: c.hint ? `atalho ${c.hint}` : undefined,
            icon: c.icon,
            disabled: c.disabled,
            run: close(c.run),
          })),
        ...cmds
          .filter((c) => c.id.startsWith('open-'))
          .map((c) => ({
            key: c.id,
            section: 'Projetos',
            label: c.label,
            icon: c.icon,
            run: close(c.run),
          })),
      ];
    }
    const cmds = filterCommands(buildCommands(), q).map((c) => ({
      key: c.id,
      section: 'Comandos',
      label: c.label,
      icon: c.icon,
      disabled: c.disabled,
      run: close(c.run),
    }));
    const res = searchBoard(projects, tasks, q, 5, new Map(tags.map((t) => [t.id, t.name] as const)));
    return [
      ...cmds,
      ...res.projects.map((p) => ({
        key: `p-${p.id}`,
        section: 'Projetos',
        label: p.name,
        icon: FolderKanban,
        run: close(() => openProject(p.id)),
      })),
      ...res.tasks.map((t) => ({
        key: `t-${t.id}`,
        section: 'Tarefas',
        label: t.title,
        sub: names.get(t.projectId),
        icon: SquareCheckBig,
        run: close(() => openEditTask(t.id)),
      })),
    ];
  }, [query, projects, tasks, tags, names, openEditTask, openProject, setOpen]);

  if (!rendered) return null;

  const runIndex = (i: number): void => {
    const item = items[i];
    if (item && !item.disabled) item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      const next =
        e.key === 'ArrowDown' ? (active + 1) % items.length : (active - 1 + items.length) % items.length;
      setActive(next);
      window.requestAnimationFrame(() => {
        const el = listRef.current?.querySelector('[aria-selected="true"]');
        if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
          (el as HTMLElement).scrollIntoView({ block: 'nearest' });
        }
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runIndex(active);
    }
  };

  let lastSection = '';
  const activeId = items[active] ? `palette-option-${active}` : undefined;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center bg-zinc-950/60 p-4 pt-[12vh] backdrop-blur-md ${
        leaving ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'
      }`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setOpen(false);
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos e busca global"
        data-testid="command-palette"
        className={`flex max-h-[70dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-pop dark:border-zinc-800 dark:bg-zinc-900 ${
          leaving ? 'animate-fade-out-scale' : 'animate-pop-in'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 transition-colors focus-within:border-[var(--accent)] dark:border-zinc-800 dark:focus-within:border-[var(--accent-bright)]">
          <Search size={18} aria-hidden className="shrink-0 text-zinc-400" />
          <input
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={activeId}
            aria-label="Buscar comandos, projetos e tarefas"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Digite um comando ou busque… (#etiqueta filtra por tag)"
            className="w-full bg-transparent py-3.5 text-[15px] outline-none placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded-md border border-zinc-300 px-1.5 py-0.5 text-[11px] font-bold text-zinc-600 sm:block dark:border-zinc-700 dark:text-zinc-400"
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" aria-label="Resultados" className="overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Nenhum resultado para “{query.trim()}”.
            </p>
          ) : (
            items.map((item, i) => {
              const header = item.section !== lastSection ? item.section : null;
              lastSection = item.section;
              const Icon = item.icon;
              return (
                <div key={item.key}>
                  {header ? (
                    <p aria-hidden className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {header}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    id={`palette-option-${i}`}
                    aria-selected={i === active}
                    aria-disabled={item.disabled}
                    disabled={item.disabled}
                    onClick={() => runIndex(i)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm',
                      i === active ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300',
                      item.disabled && 'opacity-40',
                    )}
                  >
                    <Icon size={17} aria-hidden className="shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        <Hi text={item.label} query={query} />
                      </span>
                      {item.sub ? (
                        <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
                          <Hi text={item.sub} query={query} />
                        </span>
                      ) : null}
                    </span>
                    {i === active && !item.disabled ? (
                      <CornerDownLeft size={15} aria-hidden className="shrink-0 text-zinc-400" />
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div
          aria-hidden
          className="hidden items-center gap-3 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-600 sm:flex dark:border-zinc-800 dark:text-zinc-400"
        >
          <span>↑↓ navegar</span>
          <span>Enter executar</span>
          <span>Esc fechar</span>
        </div>
      </div>
    </div>
  );
}
