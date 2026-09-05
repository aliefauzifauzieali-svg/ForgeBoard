import { create } from 'zustand';
import type { UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import { schedulePrefsPersist } from '../storage/boardStorage';
import { useThemeStore } from './useThemeStore';

/**
 * Preferências do usuário (store separada dos dados de negócio para nunca
 * contaminar as migrações do board). Persiste em `kv.preferences` no IDB,
 * com espelho síncrono do tema no localStorage (pintura sem flash).
 */
interface PrefsState extends UserPreferences {
  hydrated: boolean;
  hydrate: (prefs: UserPreferences) => void;
  setShortcutsEnabled: (v: boolean) => void;
  setLastView: (view: UserPreferences['lastView']) => void;
}

function persist(get: () => PrefsState): void {
  const { shortcutsEnabled, lastView } = get();
  const theme = useThemeStore.getState().preference;
  schedulePrefsPersist({ theme, shortcutsEnabled, lastView });
}

export const usePrefsStore = create<PrefsState>()((set, get) => ({
  ...DEFAULT_PREFERENCES,
  hydrated: false,

  hydrate: (prefs) => set({ ...prefs, hydrated: true }),

  setShortcutsEnabled: (v) => {
    set({ shortcutsEnabled: v });
    persist(get);
  },

  setLastView: (view) => {
    const current = get().lastView;
    if (current.kind === view.kind && current.kind !== 'project') return;
    if (current.kind === 'project' && view.kind === 'project' && current.projectId === view.projectId) return;
    set({ lastView: view });
    persist(get);
  },
}));
