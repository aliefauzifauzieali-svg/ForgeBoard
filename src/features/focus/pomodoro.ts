export type FocusMode = 'focus' | 'break';

export interface FocusState {
  mode: FocusMode;
  /** Segundos restantes (derivados de `endsAt` enquanto roda). */
  remainingSec: number;
  running: boolean;
  /** Epoch ms do fim do ciclo atual; null quando pausado/parado. */
  endsAt: number | null;
  /** Ciclos de foco concluídos (sessão acumulada). */
  completed: number;
}

export const FOCUS_SEC = 25 * 60;
export const BREAK_SEC = 5 * 60;
export const FOCUS_KEY = 'forgeboard:focus-timer';

const DURATION: Record<FocusMode, number> = { focus: FOCUS_SEC, break: BREAK_SEC };

export function initialFocus(): FocusState {
  return { mode: 'focus', remainingSec: FOCUS_SEC, running: false, endsAt: null, completed: 0 };
}

function sanitize(raw: unknown): FocusState {
  const base = initialFocus();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<FocusState>;
  const mode: FocusMode = r.mode === 'break' ? 'break' : 'focus';
  const completed = typeof r.completed === 'number' && Number.isFinite(r.completed) ? Math.max(0, Math.floor(r.completed)) : 0;
  const running = r.running === true && typeof r.endsAt === 'number';
  if (!running) {
    const remainingSec =
      typeof r.remainingSec === 'number' && Number.isFinite(r.remainingSec)
        ? Math.min(DURATION[mode], Math.max(0, Math.round(r.remainingSec)))
        : DURATION[mode];
    return { mode, remainingSec, running: false, endsAt: null, completed };
  }
  return { mode, remainingSec: DURATION[mode], running: true, endsAt: r.endsAt as number, completed };
}

export function loadFocusState(): FocusState {
  try {
    if (typeof localStorage === 'undefined') return initialFocus();
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return initialFocus();
    return sanitize(JSON.parse(raw) as unknown);
  } catch {
    return initialFocus();
  }
}

export function saveFocusState(s: FocusState): void {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível: timer segue em memória */
  }
}

export interface Settled {
  state: FocusState;
  /** Ciclos encerrados pelo avanço (para notificar), em ordem. */
  finished: FocusMode[];
}

/**
 * Avança o timer até `now`, virando ciclos esgotados. Puro e determinístico.
 * Retorna a MESMA referência quando nada muda (permite bail-out do React).
 */
export function settleFocus(prev: FocusState, now: number): Settled {
  if (!prev.running || prev.endsAt === null) return { state: prev, finished: [] };
  let { mode, endsAt, completed } = prev;
  const finished: FocusMode[] = [];
  // Trava de sanidade: nunca avança mais de 48h de ciclos de uma vez.
  let guard = ((48 * 3600) / Math.min(FOCUS_SEC, BREAK_SEC)) | 0;
  while (endsAt <= now && guard-- > 0) {
    finished.push(mode);
    if (mode === 'focus') completed += 1;
    mode = mode === 'focus' ? 'break' : 'focus';
    endsAt += DURATION[mode] * 1000;
  }
  if (finished.length === 0) {
    const remainingSec = Math.max(0, Math.round((endsAt - now) / 1000));
    if (remainingSec === prev.remainingSec) return { state: prev, finished };
    return { state: { ...prev, remainingSec }, finished };
  }
  return {
    state: { mode, remainingSec: Math.max(0, Math.round((endsAt - now) / 1000)), running: true, endsAt, completed },
    finished,
  };
}

/** Formata mm:ss para exibição. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
