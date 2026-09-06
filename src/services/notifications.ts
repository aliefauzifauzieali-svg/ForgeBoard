import type { Task } from '../types';

export type NotifyPermission = NotificationPermission | 'unsupported';

function todayLocalISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDay(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = new Date(`${iso}T12:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface DueTasks {
  /** Vencem em `daysBefore` dias (inclui hoje e atrasadas? não — só futuras). */
  dueSoon: Task[];
  /** Já passaram do prazo. */
  overdue: Task[];
}

/**
 * Separa tarefas abertas com prazo: atrasadas e vencendo em até N dias.
 * Pura e determinística (`todayISO` injetável em testes).
 */
export function findDueTasks(tasks: Task[], daysBefore: number, todayISO?: string): DueTasks {
  const today = startOfDay(parseDay(todayISO ?? todayLocalISO()) ?? Date.now());
  const limit = today + Math.max(0, daysBefore) * 86_400_000;
  const dueSoon: Task[] = [];
  const overdue: Task[] = [];
  for (const t of tasks) {
    if (t.status === 'done' || !t.dueDate) continue;
    const due = parseDay(t.dueDate);
    if (due === null) continue;
    const day = startOfDay(due);
    if (day < today) overdue.push(t);
    else if (day <= limit) dueSoon.push(t);
  }
  return { dueSoon, overdue };
}

/** Estado atual da permissão (ou `unsupported` sem a API). */
export function getNotificationPermission(): NotifyPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Pede permissão ao navegador; nunca lança. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Dispara a notificação do sistema quando permitido. Retorna `true` se
 * o navegador aceitou exibir (o toast da UI é responsabilidade do chamador).
 */
export function sendLocalNotification(title: string, body: string): boolean {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, tag: 'forgeboard-due' });
    return true;
  } catch {
    return false;
  }
}
