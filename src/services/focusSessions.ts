export interface FocusSession {
  id: string;
  /** Epoch ms do início (aproximado para ciclos virados fora do app). */
  startedAt: number;
  durationSec: number;
  taskId: string | null;
  taskTitle: string | null;
}

const KEY = 'forgeboard:focus-sessions';
const MAX = 120;

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lê o histórico (tolerante a lixo). Puro quanto ao formato. */
export function loadSessions(raw: unknown): FocusSession[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is FocusSession =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as FocusSession).startedAt === 'number' &&
        typeof (s as FocusSession).durationSec === 'number',
    )
    .slice(0, MAX);
}

export function readSessions(): FocusSession[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return loadSessions(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeSessions(sessions: FocusSession[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX)));
  } catch {
    /* armazenamento indisponível */
  }
}

/** Registra um ciclo de foco concluído (título congelado p/ sobreviver à exclusão da tarefa). */
export function recordFocusSession(input: { taskId: string | null; taskTitle: string | null; durationSec: number; now?: number }): FocusSession[] {
  const now = input.now ?? Date.now();
  const session: FocusSession = {
    id: uid(),
    startedAt: now - Math.max(0, input.durationSec) * 1000,
    durationSec: Math.max(0, input.durationSec),
    taskId: input.taskId,
    taskTitle: input.taskTitle,
  };
  const next = [session, ...readSessions()].slice(0, MAX);
  writeSessions(next);
  return next;
}

/** Minutos focados por dia nos últimos `days` dias (mais antigo → hoje). */
export function minutesByDay(sessions: FocusSession[], days = 7, now = Date.now()): Array<{ key: string; label: string; minutes: number; sessions: number }> {
  const buckets = new Map<string, { minutes: number; sessions: number }>();
  const daysList: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    daysList.push(d);
    buckets.set(dayKey(d.getTime()), { minutes: 0, sessions: 0 });
  }
  for (const s of sessions) {
    const b = buckets.get(dayKey(s.startedAt));
    if (b) {
      b.minutes += Math.round(s.durationSec / 60);
      b.sessions += 1;
    }
  }
  return daysList.map((d) => {
    const key = dayKey(d.getTime());
    const b = buckets.get(key) ?? { minutes: 0, sessions: 0 };
    return { key, label: `${d.getDate()}/${d.getMonth() + 1}`, ...b };
  });
}

/** Minutos focados hoje. */
export function minutesToday(sessions: FocusSession[], now = Date.now()): number {
  const today = dayKey(now);
  return sessions
    .filter((s) => dayKey(s.startedAt) === today)
    .reduce((a, s) => a + Math.round(s.durationSec / 60), 0);
}
