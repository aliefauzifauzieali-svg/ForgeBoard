import { useEffect, useRef, useState } from 'react';
import { sendLocalNotification } from '../../services/notifications';
import { recordFocusSession } from '../../services/focusSessions';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import {
  BREAK_SEC,
  FOCUS_SEC,
  loadFocusState,
  saveFocusState,
  settleFocus,
  type FocusMode,
  type FocusState,
} from './pomodoro';

function startIn(mode: FocusMode, now: number, completed: number, taskId: string | null): FocusState {
  const dur = mode === 'focus' ? FOCUS_SEC : BREAK_SEC;
  return { mode, remainingSec: dur, running: true, endsAt: now + dur * 1000, completed, taskId };
}

function notifyCycle(mode: FocusMode, taskId: string | null): void {
  const title = mode === 'focus' ? 'Foco concluído! Hora da pausa.' : 'Pausa concluída! De volta ao foco.';
  sendLocalNotification('ForgeBoard · Modo Foco', title);
  if (mode === 'focus') {
    const task = taskId ? useBoardStore.getState().tasks.find((t) => t.id === taskId) : undefined;
    recordFocusSession({ taskId, taskTitle: task?.title ?? null, durationSec: FOCUS_SEC });
  }
  try {
    useUIStore.getState().pushToast({ kind: 'success', message: title });
  } catch {
    /* ignore */
  }
}

/**
 * Timer Pomodoro 25/5 com persistência em localStorage e notificação ao fim
 * de cada ciclo. Tick de 1s; sem `setState` em corpo de efeito.
 */
export function useFocusTimer(): {
  state: FocusState;
  toggle: () => void;
  reset: () => void;
  switchMode: (mode: FocusMode) => void;
  setTask: (taskId: string | null) => void;
} {
  // Assentamento silencioso no boot (ciclos vencidos fora do app viram estado).
  const [state, setState] = useState<FocusState>(() => settleFocus(loadFocusState(), Date.now()).state);
  const ref = useRef(state);

  useEffect(() => {
    const id = window.setInterval(() => {
      const prev = ref.current;
      const next = settleFocus(prev, Date.now());
      if (next.state === prev) return;
      ref.current = next.state;
      setState(next.state);
      const discreteChanged =
        next.state.running !== prev.running ||
        next.state.endsAt !== prev.endsAt ||
        next.state.completed !== prev.completed;
      if (discreteChanged) saveFocusState(next.state);
      for (const c of next.finished) notifyCycle(c, next.state.taskId);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const commit = (s: FocusState): void => {
    ref.current = s;
    setState(s);
    saveFocusState(s);
  };

  return {
    state,
    toggle: () => {
      const cur = ref.current;
      if (cur.running) {
        commit({ ...cur, running: false, endsAt: null });
      } else {
        const dur = cur.mode === 'focus' ? FOCUS_SEC : BREAK_SEC;
        const remainingSec = cur.remainingSec > 0 ? cur.remainingSec : dur;
        commit({ ...cur, remainingSec, running: true, endsAt: Date.now() + remainingSec * 1000 });
      }
    },
    reset: () => {
      const cur = ref.current;
      const dur = cur.mode === 'focus' ? FOCUS_SEC : BREAK_SEC;
      commit({ mode: cur.mode, remainingSec: dur, running: false, endsAt: null, completed: cur.completed, taskId: cur.taskId });
    },
    switchMode: (mode: FocusMode) => {
      commit(startIn(mode, Date.now(), ref.current.completed, ref.current.taskId));
    },
    setTask: (taskId: string | null) => {
      const cur = ref.current;
      if (cur.taskId === taskId) return;
      commit({ ...cur, taskId });
    },
  };
}
