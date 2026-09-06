import { useEffect } from 'react';
import { create } from 'zustand';
import type { ResolvedTheme, ThemePreference } from '../types';
import { THEME_KEY } from '../utils/constants';
import { schedulePrefsPersist } from '../storage/boardStorage';
import { usePrefsStore } from './usePrefsStore';
// Nota: usePrefsStore também lê este store (apenas via getState em tempo de
// chamada, nunca na avaliação do módulo) — sem ciclo em tempo de import.

function readPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  /** Lê a preferência persistida. main.tsx chama no boot (evita I/O no import). */
  hydrate: () => void;
  setPreference: (p: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  preference: 'system',
  resolved: resolve('system'),
  hydrate: () => {
    const preference = readPreference();
    set({ preference, resolved: resolve(preference) });
  },
  setPreference: (p) => {
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {
      /* ignore */
    }
    set({ preference: p, resolved: resolve(p) });
    try {
      const { shortcutsEnabled, notificationsEnabled, notifyDaysBefore, lastView } = usePrefsStore.getState();
      schedulePrefsPersist({ theme: p, shortcutsEnabled, notificationsEnabled, notifyDaysBefore, lastView });
    } catch {
      /* prefs ainda não hidratadas: boot cuida */
    }
  },
}));

/** Aplica a classe `dark` no <html> e acompanha a preferência do sistema. */
export function useThemeEffect(): void {
  const preference = useThemeStore((s) => s.preference);
  const resolved = useThemeStore((s) => s.resolved);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  useEffect(() => {
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent): void => {
      useThemeStore.setState({ resolved: e.matches ? 'dark' : 'light' });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);
}
