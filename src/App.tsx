import { useRef } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ProjectModal } from './components/projects/ProjectModal';
import { TaskModal } from './components/tasks/TaskModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { ShortcutsDialog } from './components/ui/ShortcutsDialog';
import { QuarantineBanner, StorageErrorBanner } from './components/ui/StorageBanners';
import { ToastStack } from './components/ui/Toasts';
import { CommandPalette } from './features/palette/CommandPalette';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useThemeEffect } from './stores/useThemeStore';
import { useUIStore } from './stores/useUIStore';

/** Região aria-live: anuncia mutações (criar/mover/excluir…) para leitores de tela. */
function LiveRegion(): React.JSX.Element {
  const announcement = useUIStore((s) => s.announcement);
  return (
    <div key={announcement.id} role="status" aria-live="polite" className="sr-only">
      {announcement.message}
    </div>
  );
}

export default function App(): React.JSX.Element {
  useThemeEffect();
  const searchRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts(searchRef);
  const view = useUIStore((s) => s.view);
  const projectModal = useUIStore((s) => s.projectModal);
  const taskModal = useUIStore((s) => s.taskModal);
  const paletteOpen = useUIStore((s) => s.paletteOpen);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <LiveRegion />
      <Sidebar />
      <div className="lg:pl-72">
        <TopBar searchRef={searchRef} />
        <main id="main-content" className="mx-auto max-w-6xl px-4 pb-24 pt-6 lg:pb-12">
          <QuarantineBanner />
          <StorageErrorBanner />
          {view.kind === 'dashboard' ? (
            <DashboardPage />
          ) : (
            <ProjectPage key={view.projectId} projectId={view.projectId} />
          )}
          <footer className="mt-10 border-t border-zinc-200 pt-4 text-center text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            ForgeBoard · seus dados ficam no navegador (localStorage) · exporte JSON para backup
          </footer>
        </main>
      </div>
      <BottomNav />
      <ToastStack />
      {/* `key` força remount a cada abertura: os formulários inicializam no mount. */}
      <ProjectModal
        key={projectModal.open ? `project-${projectModal.editingId ?? 'new'}` : 'project-closed'}
      />
      <TaskModal
        key={
          taskModal.open
            ? `task-${taskModal.editingId ?? taskModal.presetProjectId ?? 'new'}-${taskModal.presetStatus ?? ''}`
            : 'task-closed'
        }
      />
      <CommandPalette key={paletteOpen ? 'palette-open' : 'palette-closed'} />
      <ShortcutsDialog />
      <ConfirmDialog />
    </div>
  );
}
