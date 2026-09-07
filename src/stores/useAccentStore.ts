import { useEffect } from 'react';
import { create } from 'zustand';

export interface AccentOption {
  id: string;
  label: string;
  /** Fundo principal (texto branco ≥ 4.5:1 em todos). */
  base: string;
  /** Pressionado/selecionado. */
  dark: string;
  /** Texto/ícone sobre fundos escuros. */
  bright: string;
  /** Brilho do hover (rgba). */
  glow: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'indigo', label: 'Índigo', base: '#4f46e5', dark: '#4338ca', bright: '#818cf8', glow: 'rgb(79 70 229 / 0.25)' },
  { id: 'emerald', label: 'Verde', base: '#047857', dark: '#065f46', bright: '#34d399', glow: 'rgb(4 120 87 / 0.25)' },
  { id: 'amber', label: 'Âmbar', base: '#b45309', dark: '#92400e', bright: '#fbbf24', glow: 'rgb(180 83 9 / 0.25)' },
  { id: 'rose', label: 'Rosa', base: '#be123c', dark: '#9f1239', bright: '#fb7185', glow: 'rgb(190 18 60 / 0.25)' },
  { id: 'sky', label: 'Céu', base: '#0369a1', dark: '#075985', bright: '#38bdf6', glow: 'rgb(3 105 161 / 0.25)' },
  { id: 'violet', label: 'Violeta', base: '#6d28d9', dark: '#5b21b6', bright: '#a78bfa', glow: 'rgb(109 40 217 / 0.25)' },
];

const ACCENT_KEY = 'forgeboard:accent';
const DEFAULT_ID = 'indigo';

function loadId(): string {
  try {
    const raw = localStorage.getItem(ACCENT_KEY);
    if (raw && ACCENT_OPTIONS.some((a) => a.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_ID;
}

export function accentById(id: string): AccentOption {
  return ACCENT_OPTIONS.find((a) => a.id === id) ?? ACCENT_OPTIONS[0]!;
}

/** Aplica a cor nas variáveis CSS lidas pelos componentes. */
export function applyAccent(opt: AccentOption): void {
  const root = document.documentElement;
  root.style.setProperty('--accent', opt.base);
  root.style.setProperty('--accent-dark', opt.dark);
  root.style.setProperty('--accent-bright', opt.bright);
  root.style.setProperty('--accent-glow', opt.glow);
}

interface AccentState {
  accentId: string;
  setAccent: (id: string) => void;
}

export const useAccentStore = create<AccentState>()((set) => ({
  accentId: typeof localStorage === 'undefined' ? DEFAULT_ID : loadId(),
  setAccent: (id) => {
    const opt = accentById(id);
    try {
      localStorage.setItem(ACCENT_KEY, opt.id);
    } catch {
      /* ignore */
    }
    applyAccent(opt);
    set({ accentId: opt.id });
  },
}));

/** Pinta a cor salva no boot (chamado no App, junto ao tema). */
export function useAccentEffect(): void {
  useEffect(() => {
    applyAccent(accentById(useAccentStore.getState().accentId));
  }, []);
}
