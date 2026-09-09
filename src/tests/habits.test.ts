import { beforeEach, describe, expect, it } from 'vitest';
import { isScheduledOn, isoDay, lastNDays } from '../services/habits';
import {
  minutesByDay,
  minutesToday,
  readSessions,
  recordFocusSession,
} from '../services/focusSessions';
import { useHabitStore } from '../stores/useHabitStore';
import type { Habit } from '../types';

function resetHabits(): void {
  useHabitStore.setState({ habits: [], completions: {}, hydrated: false });
}

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Ler',
    schedule: { kind: 'daily' },
    createdAt: '2026-01-01T10:00:00.000Z',
    archived: false,
    ...over,
  };
}

describe('isScheduledOn', () => {
  it('diário vale qualquer dia após a criação', () => {
    expect(isScheduledOn(habit(), '2026-09-09')).toBe(true);
    expect(isScheduledOn(habit(), '2025-12-31')).toBe(false);
  });

  it('semanal respeita os dias (2026-09-09 é quarta = 3)', () => {
    const h = habit({ schedule: { kind: 'weekly', days: [1, 3, 5] } });
    expect(isScheduledOn(h, '2026-09-09')).toBe(true);
    expect(isScheduledOn(h, '2026-09-10')).toBe(false);
  });

  it('semanal sem dias válidos comporta-se como diário', () => {
    const h = habit({ schedule: { kind: 'weekly', days: [] } });
    expect(isScheduledOn(h, '2026-09-10')).toBe(true);
  });
});

describe('lastNDays', () => {
  it('retorna n dias terminando hoje, em ordem', () => {
    const days = lastNDays(7);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(isoDay(new Date()));
    expect([...days].sort()).toEqual(days);
  });
});

describe('useHabitStore', () => {
  beforeEach(() => {
    resetHabits();
    localStorage.clear();
  });

  it('cria hábito e alterna conclusão do dia', () => {
    const h = useHabitStore.getState().createHabit({ name: '  Correr  ', schedule: { kind: 'daily' } });
    expect(h.name).toBe('Correr');
    expect(useHabitStore.getState().isDone(h.id)).toBe(false);
    useHabitStore.getState().toggleDone(h.id);
    expect(useHabitStore.getState().isDone(h.id)).toBe(true);
    useHabitStore.getState().toggleDone(h.id);
    expect(useHabitStore.getState().isDone(h.id)).toBe(false);
  });

  it('arquiva, renomeia e exclui', () => {
    const h = useHabitStore.getState().createHabit({ name: 'X', schedule: { kind: 'daily' } });
    useHabitStore.getState().updateHabit(h.id, { name: 'Y' });
    expect(useHabitStore.getState().habits[0]?.name).toBe('Y');
    useHabitStore.getState().updateHabit(h.id, { name: '   ' });
    expect(useHabitStore.getState().habits[0]?.name).toBe('Y');
    useHabitStore.getState().archiveHabit(h.id, true);
    expect(useHabitStore.getState().habits[0]?.archived).toBe(true);
    useHabitStore.getState().deleteHabit(h.id);
    expect(useHabitStore.getState().habits).toHaveLength(0);
  });

  it('persiste e hidrata, ignorando inválidos', async () => {
    const h = useHabitStore.getState().createHabit({ name: 'P', schedule: { kind: 'weekly', days: [2] } });
    useHabitStore.getState().toggleDone(h.id, '2026-09-09');
    await new Promise((r) => setTimeout(r, 0));
    resetHabits();
    await useHabitStore.getState().hydrate();
    const back = useHabitStore.getState().habits.find((x) => x.id === h.id);
    expect(back?.schedule).toEqual({ kind: 'weekly', days: [2] });
    expect(useHabitStore.getState().isDone(h.id, '2026-09-09')).toBe(true);

    const { setKV } = await import('../storage/idb');
    await setKV('habit-data', { habits: [{ id: '', name: 1 }, null], completions: { x: 'ops' } });
    resetHabits();
    await useHabitStore.getState().hydrate();
    expect(useHabitStore.getState().habits).toEqual([]);
  });
});

describe('focusSessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registra em ordem decrescente e limita a 120', () => {
    const base = Date.now();
    let last: ReturnType<typeof recordFocusSession> = [];
    for (let i = 0; i < 130; i += 1) {
      last = recordFocusSession({ taskId: null, taskTitle: null, durationSec: 1500, now: base + i });
    }
    expect(last).toHaveLength(120);
    const all = readSessions();
    expect(all).toHaveLength(120);
    expect(all[0]!.startedAt).toBeGreaterThanOrEqual(all[119]!.startedAt);
  });

  it('soma minutos de hoje e por dia da semana', () => {
    recordFocusSession({ taskId: 't1', taskTitle: 'Foco E2E', durationSec: 1500 });
    const all = readSessions();
    expect(minutesToday(all)).toBe(25);
    const week = minutesByDay(all, 7);
    expect(week).toHaveLength(7);
    expect(week[6]?.sessions).toBe(1);
    expect(week[6]?.minutes).toBe(25);
    expect(week.slice(0, 6).every((d) => d.sessions === 0)).toBe(true);
  });

  it('ignora JSON inválido', () => {
    localStorage.setItem('forgeboard:focus-sessions', '{ops');
    expect(readSessions()).toEqual([]);
  });
});
