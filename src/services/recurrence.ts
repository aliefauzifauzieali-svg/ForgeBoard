import { addDays, addMonths, addWeeks, format } from 'date-fns';
import type { Recurrence, RecurrenceKind, Subtask, Task } from '../types';
import { RECURRENCE_KINDS } from '../types';
import { generateId, nowIso } from '../utils/core';

export const RECURRENCE_META: Record<RecurrenceKind, { label: string; short: string }> = {
  daily: { label: 'Diária', short: 'todo dia' },
  weekly: { label: 'Semanal', short: 'toda semana' },
  monthly: { label: 'Mensal', short: 'todo mês' },
  custom: { label: 'Personalizada', short: 'intervalo personalizado' },
};

function parseDateOnly(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function toDateOnlyString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Próxima data de vencimento (yyyy-mm-dd) a partir de `base` (ou de hoje
 * quando a tarefa não tem prazo). `date-fns` trata viradas de mês/ano.
 */
export function nextDueDateISO(
  base: string | null,
  recurrence: Recurrence,
  todayISO?: string,
): string {
  const valid = (s: string | null | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  // Sem prazo base, conta a partir de hoje (injetável em testes).
  const from = valid(base) ? parseDateOnly(base) : valid(todayISO) ? parseDateOnly(todayISO!) : new Date();
  switch (recurrence.kind) {
    case 'daily':
      return toDateOnlyString(addDays(from, 1));
    case 'weekly':
      return toDateOnlyString(addWeeks(from, 1));
    case 'monthly':
      return toDateOnlyString(addMonths(from, 1));
    case 'custom':
      return toDateOnlyString(addDays(from, clampInterval(recurrence.intervalDays)));
  }
}

export function clampInterval(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(365, Math.max(1, Math.floor(v)));
}

/** Valida/normaliza recorrência vinda de importação; `null` quando ausente. */
export function sanitizeRecurrence(input: unknown): Recurrence | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'object' || Array.isArray(input)) return null;
  const r = input as Partial<Recurrence>;
  if (!RECURRENCE_KINDS.includes(r.kind as RecurrenceKind)) return null;
  const kind = r.kind as RecurrenceKind;
  return { kind, intervalDays: kind === 'custom' ? clampInterval(Number(r.intervalDays)) : 1 };
}

/** Valida/normaliza subtarefas vindas de importação (máx. 20, títulos ≤ 140). */
export function sanitizeSubtasks(input: unknown): Subtask[] {
  if (!Array.isArray(input)) return [];
  const out: Subtask[] = [];
  for (const raw of input.slice(0, 20)) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
    const s = raw as Partial<Subtask>;
    if (typeof s.title !== 'string' || s.title.trim().length === 0) continue;
    out.push({
      id: typeof s.id === 'string' && s.id ? s.id : generateId(),
      title: s.title.trim().slice(0, 140),
      done: s.done === true,
      createdAt: typeof s.createdAt === 'string' && !Number.isNaN(Date.parse(s.createdAt)) ? s.createdAt : nowIso(),
    });
  }
  return out;
}

/**
 * Monta a próxima ocorrência de uma tarefa recorrente concluída:
 * mesmo conteúdo, status anterior ao `done`, novo prazo e checklist zerado.
 */
export function makeFollowUp(task: Task, todayISO?: string): Task | null {
  if (!task.recurrence) return null;
  const status = task.previousStatus && task.previousStatus !== 'done' ? task.previousStatus : 'backlog';
  const now = nowIso();
  return {
    ...task,
    id: generateId(),
    status,
    previousStatus: undefined,
    completedAt: null,
    dueDate: nextDueDateISO(task.dueDate, task.recurrence, todayISO),
    subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
    createdAt: now,
    updatedAt: now,
  };
}
