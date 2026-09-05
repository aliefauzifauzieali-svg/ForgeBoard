import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { ensureDailyBackup, loadInitialData } from '../storage/boardStorage';

let booted = false;

/** Zera a trava de boot (uso exclusivo em testes). */
export function resetBootForTests(): void {
  booted = false;
}

/**
 * Boot da aplicação (main.tsx, uma vez): abre o IndexedDB, aplica migrações,
 * importa legado, hidrata os stores, restaura tema e última visão, e agenda
 * o backup diário. O splash do index.html cobre a espera (loading real).
 */
export async function bootApp(): Promise<void> {
  if (booted) return;
  booted = true;

  const initial = await loadInitialData();

  useBoardStore.getState().hydrate(initial.board, initial.backups);
  usePrefsStore.getState().hydrate(initial.preferences);

  const theme = useThemeStore.getState();
  if (theme.preference !== initial.preferences.theme) {
    theme.setPreference(initial.preferences.theme);
  }

  const lastView = initial.preferences.lastView;
  if (lastView.kind === 'project') {
    const exists = initial.board.projects.some((p) => p.id === lastView.projectId);
    useUIStore.setState({ view: exists ? lastView : { kind: 'dashboard' } });
  } else {
    useUIStore.setState({ view: lastView });
  }

  if (initial.migrated) {
    useUIStore.getState().announce('Dados atualizados para o novo formato');
  }

  void ensureDailyBackup(initial.board)
    .then((meta) => {
      if (meta) useBoardStore.getState().refreshBackups();
    })
    .catch(() => {});
}

/** Grava o que estiver pendente ao esconder/fechar a aba. */
export function flushOnHide(): void {
  const persistOne = async (): Promise<void> => {
    try {
      const { flushBoardStore } = await import('../stores/useBoardStore');
      await flushBoardStore();
      const { flushPrefs } = await import('../storage/boardStorage');
      await flushPrefs();
    } catch {
      /* melhor esforço: o próximo boot/persist cobre */
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persistOne();
  });
  window.addEventListener('pagehide', () => {
    void persistOne();
  });
}
