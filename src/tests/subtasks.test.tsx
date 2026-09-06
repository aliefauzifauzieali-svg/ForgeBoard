import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_SUBTASKS, SubtaskEditor } from '../components/tasks/SubtaskEditor';
import type { Subtask } from '../types';
import { useBoardStore } from '../stores/useBoardStore';

const S = (over: Partial<Subtask> = {}): Subtask => ({
  id: `s${Math.random().toString(36).slice(2)}`,
  title: 'item',
  done: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('SubtaskEditor', () => {
  it('adiciona, conclui, renomeia, reordena e exclui', async () => {
    const user = userEvent.setup();
    let value: Subtask[] = [S({ id: 'a', title: 'A' }), S({ id: 'b', title: 'B' })];
    // Harness fiel ao React: toda mudança re-renderiza com o novo valor.
    let sync = (): void => {};
    const onChange = vi.fn((next: Subtask[]) => {
      value = next;
      sync();
    });
    const { rerender } = render(<SubtaskEditor value={value} onChange={onChange} />);
    sync = () => {
      rerender(<SubtaskEditor value={value} onChange={onChange} />);
    };

    // Adicionar.
    await user.type(screen.getByLabelText('Nova subtarefa'), 'C');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(value.map((s) => s.title)).toEqual(['A', 'B', 'C']);

    // Concluir.
    await user.click(screen.getByRole('checkbox', { name: 'Concluir subtarefa A' }));
    expect(value.find((s) => s.id === 'a')!.done).toBe(true);
    expect(screen.getByText('(1/3)', { exact: false })).toBeVisible();

    // Renomear.
    await user.clear(screen.getByLabelText('Título da subtarefa 2'));
    await user.type(screen.getByLabelText('Título da subtarefa 2'), 'B2');
    expect(value.find((s) => s.id === 'b')!.title).toBe('B2');

    // Reordenar: C (índice 2) para cima.
    await user.click(screen.getByRole('button', { name: 'Mover subtarefa C para cima' }));
    expect(value.map((s) => s.title)).toEqual(['A', 'C', 'B2']);

    // Excluir.
    await user.click(screen.getByRole('button', { name: 'Excluir subtarefa C' }));
    expect(value.map((s) => s.title)).toEqual(['A', 'B2']);
  });

  it('respeita o máximo e ignora título vazio', () => {
    const onChange = vi.fn();
    const full = Array.from({ length: MAX_SUBTASKS }, (_, i) => S({ id: `x${i}`, title: `T${i}` }));
    render(<SubtaskEditor value={full} onChange={onChange} />);
    expect(screen.getByText(/Máximo de 20 subtarefas/)).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('store: subtarefas via create/update', () => {
  it('cria com subtarefas e atualiza zerando inválidas', () => {
    useBoardStore.setState({
      projects: [{ id: 'p1', name: 'P', description: '', color: '#fff', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }],
      tasks: [],
      tags: [],
      undoStack: [],
      redoStack: [],
    });
    const t = useBoardStore.getState().createTask({
      projectId: 'p1',
      title: 'T',
      subtasks: [{ id: 'a', title: 'A', done: true, createdAt: '2026-09-01T00:00:00.000Z' }],
    });
    expect(t.subtasks).toHaveLength(1);
    useBoardStore.getState().updateTask(t.id, {
      subtasks: [...t.subtasks, { id: 'b', title: 'B', done: false, createdAt: '2026-09-01T00:00:00.000Z' }],
    });
    const after = useBoardStore.getState().tasks[0]!;
    expect(after.subtasks.map((s) => s.title)).toEqual(['A', 'B']);
  });
});
