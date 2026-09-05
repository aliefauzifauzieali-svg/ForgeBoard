import {
  Download,
  FolderKanban,
  Home,
  Keyboard,
  Moon,
  Plus,
  Redo2,
  Sun,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useBoardStore } from '../../stores/useBoardStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUIStore } from '../../stores/useUIStore';
import { exportBoardNow } from '../../services/boardIO';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords: string;
  disabled?: boolean;
  run: () => void;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Comandos disponíveis na paleta (navegação + ações principais). */
export function buildCommands(): PaletteCommand[] {
  const ui = useUIStore.getState();
  const board = useBoardStore.getState();
  const theme = useThemeStore.getState();
  const currentProjectId = ui.view.kind === 'project' ? ui.view.projectId : null;

  return [
    {
      id: 'new-task',
      label: 'Nova tarefa',
      hint: 'N',
      icon: Plus,
      keywords: 'criar adicionar tarefa task',
      run: () => ui.openNewTask(currentProjectId, null),
    },
    {
      id: 'new-project',
      label: 'Novo projeto',
      hint: 'P',
      icon: FolderKanban,
      keywords: 'criar projeto project',
      run: () => ui.openNewProject(),
    },
    {
      id: 'go-dashboard',
      label: 'Ir para o Dashboard',
      icon: Home,
      keywords: 'inicio dashboard home visão geral',
      run: () => ui.goDashboard(),
    },
    ...board.projects.slice(0, 8).map((p) => ({
      id: `open-${p.id}`,
      label: `Abrir ${p.name}`,
      icon: FolderKanban,
      keywords: `abrir projeto ${p.name}`,
      run: () => ui.openProject(p.id),
    })),
    {
      id: 'toggle-theme',
      label: theme.resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro',
      icon: theme.resolved === 'dark' ? Sun : Moon,
      keywords: 'tema claro escuro dark light theme',
      run: () => theme.setPreference(theme.resolved === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'undo',
      label: 'Desfazer',
      icon: Undo2,
      keywords: 'desfazer undo',
      disabled: board.undoStack.length === 0,
      run: () => board.undo(),
    },
    {
      id: 'redo',
      label: 'Refazer',
      icon: Redo2,
      keywords: 'refazer redo',
      disabled: board.redoStack.length === 0,
      run: () => board.redo(),
    },
    {
      id: 'export',
      label: 'Exportar dados (JSON)',
      icon: Download,
      keywords: 'exportar backup json salvar',
      run: () => exportBoardNow(),
    },
    {
      id: 'shortcuts',
      label: 'Ver atalhos de teclado',
      hint: '?',
      icon: Keyboard,
      keywords: 'atalhos shortcuts ajuda teclas',
      run: () => ui.setShortcutsOpen(true),
    },
  ];
}

/** Filtra comandos por texto (AND entre tokens, ignora acentos). */
export function filterCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const toks = norm(query).split(/\s+/).filter(Boolean);
  if (toks.length === 0) return commands;
  return commands.filter((c) => {
    const hay = norm(`${c.label} ${c.keywords}`);
    return toks.every((t) => hay.includes(t));
  });
}
