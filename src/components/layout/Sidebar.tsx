import { BarChart3, CalendarDays, Download, LayoutDashboard, NotebookPen, Plus, Repeat, Settings as SettingsIcon, Upload, Wallet } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseImport } from '../../services/boardIO';
import { exportBoardNow, type ExportFormat } from '../../services/boardIO';
import { parseCsvTasks } from '../../services/csv';
import { FORMAT_VERSION } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUIStore } from '../../stores/useUIStore';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { MAX_IMPORT_BYTES } from '../../utils/constants';
import { cn } from '../../utils/core';
import { InstallButton } from '../ui/InstallButton';
import { Spinner } from '../ui/Spinner';

export function ThemeToggle({ compact }: { compact?: boolean }): React.JSX.Element {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const cycle = (): void => {
    const next = preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
    setPreference(next);
  };
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema atual: ${preference}. Clique para alternar entre claro, escuro e sistema.`}
      title={`Tema: ${preference}`}
      className={compact ? 'icon-btn' : 'btn-ghost w-full !justify-start text-xs'}
    >
      <span aria-hidden>{preference === 'light' ? '☀️' : preference === 'dark' ? '🌙' : '💻'}</span>
      {compact ? null : <span className="capitalize">Tema: {label(preference)}</span>}
    </button>
  );
}

function label(p: string): string {
  if (p === 'light') return 'claro';
  if (p === 'dark') return 'escuro';
  return 'sistema';
}

export function DataButtons({ onDone }: { onDone?: () => void }): React.JSX.Element {
  const replaceAll = useBoardStore((s) => s.replaceAll);
  const importTasks = useBoardStore((s) => s.importTasks);
  const projects = useBoardStore((s) => s.projects);
  const view = useUIStore((s) => s.view);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');
  // Projeto alvo do CSV: o aberto, ou o primeiro.
  const defaultTarget = view.kind === 'project' ? view.projectId : (projects[0]?.id ?? '');
  const [targetId, setTargetId] = useState('');
  const target = targetId || defaultTarget;

  const doExport = (): void => {
    const { projects, tasks, tags } = useBoardStore.getState();
    exportBoardNow({ version: FORMAT_VERSION, projects, tasks, tags }, format);
    onDone?.();
  };

  const onFile = async (file: File): Promise<void> => {
    setError('');
    if (file.size > MAX_IMPORT_BYTES) {
      setError(
        `Arquivo muito grande (máximo ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB).`,
      );
      return;
    }
    setBusy(true);
    try {
      const raw = await file.text();
      const result = parseImport(raw);
      if (!result.ok || !result.data) {
        setError(`Arquivo inválido: ${result.errors.slice(0, 3).join(' · ')}`);
        return;
      }
    const data = result.data;
    askConfirm({
      title: 'Substituir dados?',
      description:
        `O arquivo contém ${data.projects.length} projetos, ${data.tasks.length} tarefas e ` +
        `${data.tags.length} etiquetas validadas. Os dados atuais serão substituídos.` +
        (result.migrated ? ' O arquivo é de versão antiga e será atualizado.' : ''),
        confirmLabel: 'Substituir',
        action: () => {
          replaceAll(data);
          onDone?.();
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const onFileCsv = async (file: File): Promise<void> => {
    setError('');
    if (file.size > MAX_IMPORT_BYTES) {
      setError(
        `Arquivo muito grande (máximo ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB).`,
      );
      return;
    }
    if (!target || !projects.some((p) => p.id === target)) {
      setError('Escolha o projeto de destino antes de importar o CSV.');
      return;
    }
    setBusy(true);
    try {
      const raw = await file.text();
      const parsed = parseCsvTasks(raw);
      let imported = 0;
      try {
        imported = importTasks(target, parsed.rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível importar.');
        return;
      }
      if (parsed.errors.length > 0) {
        setError(
          `${imported} ${imported === 1 ? 'tarefa importada' : 'tarefas importadas'}; ` +
            `${parsed.errors.length} ${parsed.errors.length === 1 ? 'linha ignorada' : 'linhas ignoradas'}: ` +
            parsed.errors.slice(0, 3).join(' · '),
        );
      }
      if (imported > 0) onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" aria-busy={busy}>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1 text-xs" onClick={doExport}>
          <Download size={14} aria-hidden /> Exportar
        </button>
        <button
          type="button"
          className="btn-ghost flex-1 text-xs"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? (
            <>
              <Spinner label="Importando arquivo" /> Importando…
            </>
          ) : (
            <>
              <Upload size={14} aria-hidden /> Importar
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Selecionar arquivo JSON para importar"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="export-format" className="shrink-0 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Formato
        </label>
        <select
          id="export-format"
          className="input min-w-0 flex-1 !py-2 text-xs"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          aria-label="Formato de exportação"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="md">Markdown</option>
        </select>
      </div>
      <div className="flex gap-2">
        <label htmlFor="csv-target" className="sr-only">
          Projeto de destino do CSV
        </label>
        <select
          id="csv-target"
          className="input min-w-0 flex-1 !py-2 text-xs"
          value={target}
          onChange={(e) => setTargetId(e.target.value)}
          aria-label="Projeto de destino do CSV"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost flex-1 text-xs"
          disabled={busy || projects.length === 0}
          onClick={() => csvFileRef.current?.click()}
        >
          {busy ? (
            <>
              <Spinner label="Importando CSV" /> Importando…
            </>
          ) : (
            <>
              <Upload size={14} aria-hidden /> Importar CSV
            </>
          )}
        </button>
        <input
          ref={csvFileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Selecionar arquivo CSV para importar tarefas"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFileCsv(f);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
        CSV com colunas título, descrição, status, prioridade, prazo (aaaa-mm-dd), tags e projeto (opcional).
      </p>
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Sidebar(): React.JSX.Element {
  const projects = useBoardStore((s) => s.projects);
  const view = useUIStore((s) => s.view);
  const goDashboard = useUIStore((s) => s.goDashboard);
  const goCalendar = useUIStore((s) => s.goCalendar);
  const goStats = useUIStore((s) => s.goStats);
  const goNotes = useUIStore((s) => s.goNotes);
  const goHabits = useUIStore((s) => s.goHabits);
  const goFinance = useUIStore((s) => s.goFinance);
  const openProject = useUIStore((s) => s.openProject);
  const openNewProject = useUIStore((s) => s.openNewProject);
  const openNewTask = useUIStore((s) => s.openNewTask);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const isTouch = useIsTouchDevice();

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        aria-label="Navegação principal"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform dark:border-white/[0.06] dark:bg-[#0E0E11]',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-black text-white"
          >
            F
          </span>
          <div>
            <p className="text-[15px] font-extrabold leading-none tracking-tight">ForgeBoard</p>
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">local-first · offline</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Projetos">
          <button
            type="button"
            onClick={goDashboard}
            aria-current={view.kind === 'dashboard' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'dashboard'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <LayoutDashboard
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'dashboard' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Dashboard
          </button>
          <button
            type="button"
            onClick={goCalendar}
            aria-current={view.kind === 'calendar' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'calendar'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <CalendarDays
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'calendar' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Calendário
          </button>
          <button
            type="button"
            onClick={goStats}
            aria-current={view.kind === 'stats' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'stats'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <BarChart3
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'stats' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Estatísticas
          </button>
          <button
            type="button"
            onClick={goNotes}
            aria-current={view.kind === 'notes' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'notes'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <NotebookPen
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'notes' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Notas
          </button>
          <button
            type="button"
            onClick={goHabits}
            aria-current={view.kind === 'habits' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'habits'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <Repeat
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'habits' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Hábitos
          </button>
          <button
            type="button"
            onClick={goFinance}
            aria-current={view.kind === 'finance' ? 'page' : undefined}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
              view.kind === 'finance'
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
            )}
          >
            <Wallet
              size={17}
              aria-hidden
              className={cn(
                'shrink-0 transition-[transform,color] duration-200 group-hover:scale-110',
                view.kind === 'finance' && 'dark:text-[var(--accent-bright)]',
              )}
            />
            Economia
          </button>

          <div className="flex items-center justify-between px-3 pb-1 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Projetos</p>
            <button
              type="button"
              onClick={openNewProject}
              className="icon-btn !h-7 !w-7"
              aria-label="Novo projeto (P)"
            >
              <Plus size={15} />
            </button>
          </div>

          <ul className="space-y-0.5">
            {projects.map((p) => {
              const active = view.kind === 'project' && view.projectId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProject(p.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-[transform,background-color,color] duration-200 hover:translate-x-0.5',
                      active
                        ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] font-semibold text-[var(--accent-dark)] dark:bg-white/[0.06] dark:text-zinc-100'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
                    )}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
              Nenhum projeto.{isTouch ? '' : ' Crie o primeiro com “P”.'}
            </p>
          ) : null}
        </nav>

        <div className="space-y-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <InstallButton />
          <button type="button" className="btn-primary w-full" onClick={() => openNewTask(null, null)}>
            <Plus size={16} aria-hidden /> Nova tarefa
            {isTouch ? null : (
              <kbd aria-hidden className="ml-auto rounded bg-white/20 px-1.5 text-[10px]">
                N
              </kbd>
            )}
          </button>
          <DataButtons />
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost w-full !justify-start text-xs"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon size={15} aria-hidden /> Configurações
          </button>
          {isTouch ? (
            <p className="text-center text-[10px] text-zinc-600 dark:text-zinc-400">
              Toque nos botões para criar, mover e organizar.
            </p>
          ) : (
            <p className="text-center text-[10px] text-zinc-600 dark:text-zinc-400">
              Atalhos: <kbd>N</kbd> tarefa · <kbd>T</kbd> hoje · <kbd>P</kbd> projeto · <kbd>/</kbd> busca ·{' '}
              <kbd>Ctrl K</kbd> paleta · <kbd>?</kbd> ajuda · <kbd>Esc</kbd> fecha
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
