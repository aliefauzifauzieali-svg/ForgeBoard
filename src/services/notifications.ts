import type { Task } from '../types';
import { todayDateOnly } from '../utils/date';
import { isTauri } from '../utils/platform';

export type NotifyPermission = NotificationPermission | 'unsupported';

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
  const today = startOfDay(parseDay(todayISO ?? todayDateOnly()) ?? Date.now());
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

/** Pede permissão; nunca lança. No desktop usa o plugin nativo (a API do
 * WebView2 não concede permissão como um navegador comum). */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (isTauri()) {
    try {
      const { requestPermission } = await import('@tauri-apps/plugin-notification');
      return await requestPermission();
    } catch {
      return 'default';
    }
  }
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
 * No desktop envia via plugin nativo (Windows Toast) de forma assíncrona.
 */
export function sendLocalNotification(title: string, body: string): boolean {
  if (isTauri()) {
    void (async () => {
      try {
        const { isPermissionGranted, sendNotification } = await import('@tauri-apps/plugin-notification');
        if (await isPermissionGranted()) sendNotification({ title, body });
      } catch {
        /* ignore */
      }
    })();
    return true;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, tag: 'forgeboard-due' });
    return true;
  } catch {
    return false;
  }
}
