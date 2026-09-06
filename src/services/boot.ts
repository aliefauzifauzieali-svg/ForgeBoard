import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { ensureDailyBackup, loadInitialData } from '../storage/boardStorage';
import {
  ACTIVITY_RETENTION_DAYS,
  flushActivity,
  pruneActivity,
  type NewActivityEvent,
} from '../storage/activity';
import { getKV, setKV } from '../storage/idb';
import type { BoardData } from '../types';
import { FORMAT_VERSION } from '../types';

let booted = false;

/** Zera a trava de boot (uso exclusivo em testes). */
export function resetBootForTests(): void {
  booted = false;
}

/**
 * Backfill único: conclusões pré-existentes (legado/import) ganham eventos
 * `task.created`/`task.completed` com os timestamps reais, para as métricas
 * históricas não começarem vazias. Idempotente via flag.
 */
async function backfillLegacyCompletions(board: BoardData): Promise<void> {
  try {
    if (await getKV<boolean>('backfill.completed.v1')) return;
    const done = board.tasks.filter((t) => t.status === 'done' && t.completedAt);
    if (done.length > 0) {
      const { queryEvents } = await import('../storage/activity');
      const have = new Set(
        (await queryEvents({ types: ['task.created', 'task.completed'], limit: 2000 })).map(
          (e) => `${e.type}:${e.entityId}`,
        ),
      );
      const fresh: NewActivityEvent[] = [];
      for (const t of done) {
        if (!have.has(`task.created:${t.id}`)) {
          fresh.push({ type: 'task.created', entity: 'task', entityId: t.id, projectId: t.projectId, at: t.createdAt, meta: { title: t.title, status: 'backlog', tagIds: t.tagIds } });
        }
        if (!have.has(`task.completed:${t.id}`) && t.completedAt) {
          fresh.push({ type: 'task.completed', entity: 'task', entityId: t.id, projectId: t.projectId, at: t.completedAt, meta: { title: t.title, tagIds: t.tagIds } });
        }
      }
      if (fresh.length > 0) {
        const { logEventsBulk } = await import('../storage/activity');
        logEventsBulk(fresh);
        await flushActivity();
      }
    }
    await setKV('backfilled.completed.v1', true).catch(() => {});
  } catch {
    /* métricas degradam sem travar o boot */
  }
}

/**
 * Boot da aplicação (main.tsx, uma vez): abre o IndexedDB, aplica migrações,
 * importa legado, hidrata os stores, restaura tema e última visão, e agenda
 * o backup diário. O splash do index.html cobre a espera (loading real).
 */
export async function bootApp(): Promise<void> {
  if (booted) return;
  booted = true;

  let initial;
  try {
    initial = await loadInitialData();
  } catch (error) {
    // Storage totalmente indisponível: sobe vazio mas avisa (nunca tela morta).
    console.error('[ForgeBoard] falha ao carregar dados no boot:', error);
    initial = null;
  }

  if (!initial) {
    useBoardStore.getState().hydrate({ version: FORMAT_VERSION, projects: [], tasks: [], tags: [] }, []);
    useUIStore.getState().pushToast({
      kind: 'error',
      message: 'Armazenamento indisponível — os dados podem não carregar',
    });
    return;
  }

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

  // Retenção do log + backfill de conclusões legadas (não bloqueiam a UI).
  void pruneActivity(new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 86_400_000).toISOString()).catch(() => {});
  void backfillLegacyCompletions(initial.board).catch(() => {});

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
