import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import {
  BREAK_SEC,
  FOCUS_KEY,
  FOCUS_SEC,
  formatClock,
  initialFocus,
  loadFocusState,
  saveFocusState,
  settleFocus,
} from '../features/focus/pomodoro';
import { FocusTimer } from '../features/focus/FocusTimer';
import { useUIStore } from '../stores/useUIStore';

const RUNNING_FOCUS = {
  mode: 'focus' as const,
  remainingSec: FOCUS_SEC,
  running: true,
  endsAt: 1_000_000 + FOCUS_SEC * 1000,
  completed: 0,
  taskId: null as string | null,
};

describe('settleFocus (puro)', () => {
  it('parado não muda (mesma referência)', () => {
    const s = initialFocus();
    expect(settleFocus(s, 999_999_999).state).toBe(s);
  });

  it('conta regressiva sem virar ciclo', () => {
    const { state, finished } = settleFocus(RUNNING_FOCUS, 1_000_000 + 60_000);
    expect(finished).toEqual([]);
    expect(state.remainingSec).toBe(FOCUS_SEC - 60);
    expect(state.running).toBe(true);
  });

  it('vira foco→pausa e conta o ciclo', () => {
    const { state, finished } = settleFocus(RUNNING_FOCUS, 1_000_000 + FOCUS_SEC * 1000);
    expect(finished).toEqual(['focus']);
    expect(state.mode).toBe('break');
    expect(state.completed).toBe(1);
    expect(state.remainingSec).toBe(BREAK_SEC);
  });

  it('atravessa vários ciclos de uma vez', () => {
    const { state, finished } = settleFocus(RUNNING_FOCUS, 1_000_000 + (FOCUS_SEC + BREAK_SEC + 10) * 1000);
    expect(finished).toEqual(['focus', 'break']);
    expect(state.mode).toBe('focus');
    expect(state.completed).toBe(1);
    expect(state.remainingSec).toBe(FOCUS_SEC - 10);
  });

  it('formatClock em mm:ss', () => {
    expect(formatClock(1500)).toBe('25:00');
    expect(formatClock(61)).toBe('01:01');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('persistência localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trip com saneamento', () => {
    expect(loadFocusState()).toEqual(initialFocus());
    saveFocusState({ ...RUNNING_FOCUS, completed: 3 });
    const back = loadFocusState();
    expect(back.completed).toBe(3);
    expect(back.running).toBe(true);
    localStorage.setItem(FOCUS_KEY, '{ inválido');
    expect(loadFocusState()).toEqual(initialFocus());
  });
});

describe('FocusTimer (componente)', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ toasts: [] });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:00:00'));
  });

  it('inicia, vira o ciclo com toast e reinicia', () => {
    render(<FocusTimer />);
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(FOCUS_SEC * 1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
    expect(useUIStore.getState().toasts.some((t) => t.message.includes('Foco concluído'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');

    fireEvent.click(screen.getByRole('button', { name: /Foco · 25min/ }));
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
    vi.useRealTimers();
  });
});
