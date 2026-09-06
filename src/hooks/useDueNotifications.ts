import { useEffect, useRef } from 'react';
import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useUIStore } from '../stores/useUIStore';
import { findDueTasks, sendLocalNotification } from '../services/notifications';

const CHECK_MS = 15 * 60 * 1000;

/**
 * Notificações locais de prazo: ao montar, quando as tarefas mudam e a cada
 * 15 min, avisa uma vez por tarefa/sessão sobre vencimentos próximos e
 * atrasos. Sempre mostra toast; a notificação do sistema exige permissão
 * concedida. Sem `setState` em efeito (só sistemas externos).
 */
export function useDueNotifications(): void {
  const seenRef = useRef<Set<string>>(new Set());
  const tasks = useBoardStore((s) => s.tasks);

  useEffect(() => {
    const check = (): void => {
      const prefs = usePrefsStore.getState();
      if (!prefs.notificationsEnabled) return;
      const projectName = new Map(useBoardStore.getState().projects.map((p) => [p.id, p.name] as const));
      const { dueSoon, overdue } = findDueTasks(tasks, prefs.notifyDaysBefore);
      const fresh = [...overdue.map((t) => ({ t, late: true })), ...dueSoon.map((t) => ({ t, late: false }))].filter(
        ({ t }) => !seenRef.current.has(t.id),
      );
      if (fresh.length === 0) return;
      const ui = useUIStore.getState();
      for (const { t, late } of fresh) {
        seenRef.current.add(t.id);
        const where = projectName.get(t.projectId);
        const title = late ? `Tarefa atrasada: ${t.title}` : `Vence em breve: ${t.title}`;
        const body = `${t.dueDate ?? 'sem prazo'}${where ? ` · ${where}` : ''}`;
        sendLocalNotification(title, body);
        ui.pushToast({ kind: late ? 'error' : 'info', message: `${title} (${body})` });
      }
    };
    check();
    const timer = window.setInterval(check, CHECK_MS);
    return () => window.clearInterval(timer);
  }, [tasks]);
}
