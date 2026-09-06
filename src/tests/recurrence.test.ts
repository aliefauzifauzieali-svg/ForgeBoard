import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampInterval,
  makeFollowUp,
  nextDueDateISO,
  sanitizeRecurrence,
  sanitizeSubtasks,
} from '../services/recurrence';
import type { Task } from '../types';
import { useBoardStore } from '../stores/useBoardStore';

function baseTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    projectId: 'p1',
    title: 'Regar plantas',
    description: '',
    priority: 'medium',
    status: 'backlog',
    tagIds: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    completedAt: null,
    dueDate: '2026-09-10',
    recurrence: { kind: 'daily', intervalDays: 1 },
    subtasks: [],
    ...over,
  };
}

describe('nextDueDateISO', () => {
  it('avança 1 dia (diária)', () => {
    expect(nextDueDateISO('2026-09-10', { kind: 'daily', intervalDays: 1 })).toBe('2026-09-11');
  });
  it('avança 1 semana (semanal)', () => {
    expect(nextDueDateISO('2026-09-10', { kind: 'weekly', intervalDays: 1 })).toBe('2026-09-17');
  });
  it('avança 1 mês com clamp de fim de mês (mensal)', () => {
    expect(nextDueDateISO('2026-01-31', { kind: 'monthly', intervalDays: 1 })).toBe('2026-02-28');
  });
  it('usa o intervalo personalizado em dias', () => {
    expect(nextDueDateISO('2026-09-10', { kind: 'custom', intervalDays: 10 })).toBe('2026-09-20');
  });
  it('sem prazo base, conta a partir de hoje', () => {
    expect(nextDueDateISO(null, { kind: 'daily', intervalDays: 1 }, '2026-09-06')).toBe('2026-09-07');
  });
});

describe('sanitize', () => {
  it('clampInterval limita 1..365', () => {
    expect(clampInterval(0)).toBe(1);
    expect(clampInterval(400)).toBe(365);
    expect(clampInterval(2.7)).toBe(2);
    expect(clampInterval(Number.NaN)).toBe(1);
  });
  it('sanitizeRecurrence aceita válida e rejeita inválidas', () => {
    expect(sanitizeRecurrence({ kind: 'weekly', intervalDays: 99 })).toEqual({ kind: 'weekly', intervalDays: 1 });
    expect(sanitizeRecurrence({ kind: 'custom', intervalDays: 5 })).toEqual({ kind: 'custom', intervalDays: 5 });
    expect(sanitizeRecurrence(null)).toBeNull();
    expect(sanitizeRecurrence(undefined)).toBeNull();
    expect(sanitizeRecurrence({ kind: 'yearly' })).toBeNull();
    expect(sanitizeRecurrence('daily')).toBeNull();
  });
  it('sanitizeSubtasks normaliza e limita', () => {
    expect(sanitizeSubtasks('x')).toEqual([]);
    const out = sanitizeSubtasks([{ title: '  a  ' }, { title: '' }, null, { title: 'b', done: true }]);
    expect(out.map((s) => [s.title, s.done])).toEqual([['a', false], ['b', true]]);
    expect(out[0]!.id).toBeTruthy();
  });
});

describe('makeFollowUp', () => {
  it('gera próxima ocorrência com status anterior e novo prazo', () => {
    const task = baseTask({ status: 'backlog', previousStatus: undefined });
    const next = makeFollowUp({ ...task, status: 'backlog' });
    expect(next).not.toBeNull();
    expect(next!.id).not.toBe(task.id);
    expect(next!.status).toBe('backlog');
    expect(next!.dueDate).toBe('2026-09-11');
    expect(next!.recurrence).toEqual(task.recurrence);
    expect(next!.completedAt).toBeNull();
  });
  it('retorna null sem recorrência e zera o checklist', () => {
    expect(makeFollowUp(baseTask({ recurrence: null }))).toBeNull();
    const next = makeFollowUp(
      baseTask({ subtasks: [{ id: 's1', title: 'a', done: true, createdAt: '2026-09-01T00:00:00.000Z' }] }),
    );
    expect(next!.subtasks).toEqual([
      { id: 's1', title: 'a', done: false, createdAt: '2026-09-01T00:00:00.000Z' },
    ]);
  });
});

describe('store: conclusão de recorrente', () => {
  beforeEach(() => {
    useBoardStore.setState({
      projects: [{ id: 'p1', name: 'P', description: '', color: '#fff', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }],
      tasks: [baseTask()],
      tags: [],
      undoStack: [],
      redoStack: [],
    });
  });

  it('moveTask para done cria a próxima ocorrência no mesmo histórico', () => {
    useBoardStore.getState().moveTask('t1', 'done');
    const tasks = useBoardStore.getState().tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.find((t) => t.id === 't1')!.status).toBe('done');
    const next = tasks.find((t) => t.id !== 't1')!;
    expect(next.status).toBe('backlog');
    expect(next.dueDate).toBe('2026-09-11');
    // Um único pushHistory: desfazer remove a conclusão E a ocorrência.
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().tasks).toHaveLength(1);
  });

  it('updateTask para done também gera ocorrência; sem recorrência não gera', () => {
    useBoardStore.setState((s) => ({
      tasks: s.tasks.map((t) => ({ ...t, recurrence: null })),
    }));
    useBoardStore.getState().updateTask('t1', { status: 'done' });
    expect(useBoardStore.getState().tasks).toHaveLength(1);
  });

  it('remove a recorrência com null', () => {
    useBoardStore.getState().updateTask('t1', { recurrence: null });
    expect(useBoardStore.getState().tasks[0]!.recurrence).toBeNull();
    useBoardStore.getState().moveTask('t1', 'done');
    expect(useBoardStore.getState().tasks).toHaveLength(1);
  });
});
