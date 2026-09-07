import { useEffect, useRef } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ProjectModal } from './components/projects/ProjectModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { TaskModal } from './components/tasks/TaskModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { ShortcutsDialog } from './components/ui/ShortcutsDialog';
import { QuarantineBanner, StorageErrorBanner } from './components/ui/StorageBanners';
import { ToastStack } from './components/ui/Toasts';
import { CommandPalette } from './features/palette/CommandPalette';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDueNotifications } from './hooks/useDueNotifications';
import { useThemeEffect } from './stores/useThemeStore';
import { useAccentEffect } from './stores/useAccentStore';
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
  useAccentEffect();
  useEffect(() => {
    // Splash inicial (index.html): remove após o primeiro paint do React.
    document.getElementById('boot-splash')?.remove();
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts(searchRef);
  useDueNotifications();
  const view = useUIStore((s) => s.view);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <LiveRegion />
      <Sidebar />
      <div className="lg:pl-72">
        <TopBar searchRef={searchRef} />
        <main id="main-content" className="mx-auto max-w-6xl px-4 pb-24 pt-6 lg:pb-12">
          <OfflineBanner />
          <QuarantineBanner />
          <StorageErrorBanner />
          {/* Fade a cada troca de visão (remonta o contêiner). */}
          <div
            key={view.kind === 'project' ? `project-${view.projectId}` : view.kind}
            className="animate-fade-in"
          >
            {view.kind === 'dashboard' ? (
              <DashboardPage />
            ) : view.kind === 'project' ? (
              <ProjectPage projectId={view.projectId} />
            ) : view.kind === 'calendar' ? (
              <CalendarPage />
            ) : (
              <StatsPage />
            )}
          </div>
          <footer className="mt-10 border-t border-zinc-200 pt-4 text-center text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            ForgeBoard · seus dados ficam no navegador (localStorage) · exporte JSON para backup
          </footer>
        </main>
      </div>
      <BottomNav />
      <ToastStack />
      {/* Modais montados de forma estável (saída animada); reset via `key` interno. */}
      <ProjectModal />
      <TaskModal />
      <CommandPalette />
      <ShortcutsDialog />
      <SettingsModal />
      <ConfirmDialog />
    </div>
  );
}
