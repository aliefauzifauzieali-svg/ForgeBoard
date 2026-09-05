import { describe, expect, it } from 'vitest';
import {
  bucketTasksByDate,
  buildDayBuckets,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  getMonthCells,
  getWeekDays,
  parseDateOnly,
  shiftCursor,
  tasksWithoutDueDate,
  toDateOnlyString,
  weekdayHeaders,
  type CalendarMode,
} from '../services/calendar';
import type { Task } from '../types';

const T = (id: string, dueDate: string | null, extra: Partial<Task> = {}): Task => ({
  id,
  projectId: 'p1',
  title: `Tarefa ${id}`,
  description: '',
  priority: 'medium',
  status: 'backlog',
  createdAt: `2026-09-0${id}T10:00:00.000Z`,
  updatedAt: `2026-09-0${id}T10:00:00.000Z`,
  dueDate,
  tags: [],
  ...extra,
});

describe('parseDateOnly / toDateOnlyString', () => {
  it('converte sem deslocar o dia (prova de timezone)', () => {
    const d = parseDateOnly('2026-09-05');
    expect(d).not.toBeNull();
    // Componentes locais, não UTC: meio-dia local nunca cai no dia vizinho.
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(5);
    expect(toDateOnlyString(d!)).toBe('2026-09-05');
  });

  it('rejeita nulo, vazio e datas impossíveis', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('05/09/2026')).toBeNull();
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('2026-13-01')).toBeNull();
  });
});

describe('getMonthCells', () => {
  it('gera 42 células começando na segunda-feira', () => {
    // Setembro/2026: dia 1º cai numa terça.
    const cells = getMonthCells(new Date(2026, 8, 15));
    expect(cells).toHaveLength(42);
    expect(cells[0]?.getDay()).toBe(1); // segunda
    expect(toDateOnlyString(cells[0]!)).toBe('2026-08-31');
    expect(toDateOnlyString(cells[cells.length - 1]!)).toBe('2026-10-11');
    expect(cells.every((c, i, arr) => i === 0 || c.getTime() - arr[i - 1]!.getTime() === 86_400_000)).toBe(true);
  });

  it('completa 6 semanas em mês curto (fevereiro/2021)', () => {
    const cells = getMonthCells(new Date(2021, 1, 10));
    expect(cells).toHaveLength(42);
    expect(toDateOnlyString(cells[0]!)).toBe('2021-02-01');
  });
});

describe('getWeekDays / shiftCursor', () => {
  it('semana seg–dom contendo o cursor', () => {
    const days = getWeekDays(new Date(2026, 8, 5)); // sábado
    expect(days).toHaveLength(7);
    expect(toDateOnlyString(days[0]!)).toBe('2026-08-31');
    expect(toDateOnlyString(days[6]!)).toBe('2026-09-06');
  });

  it('navega por mês, semana e dia', () => {
    const base = new Date(2026, 8, 15);
    const modes: CalendarMode[] = ['month', 'week', 'day'];
    expect(modes.map((m) => toDateOnlyString(shiftCursor(base, m, 1)))).toEqual([
      '2026-10-15',
      '2026-09-22',
      '2026-09-16',
    ]);
    expect(toDateOnlyString(shiftCursor(base, 'month', -1))).toBe('2026-08-15');
  });
});

describe('rótulos pt-BR', () => {
  it('formata títulos de mês, semana e dia', () => {
    expect(formatMonthTitle(new Date(2026, 8, 15))).toBe('Setembro de 2026');
    expect(formatWeekTitle(new Date(2026, 8, 5))).toBe('31 ago – 6 set 2026');
    expect(formatDayTitle(new Date(2026, 8, 5))).toBe('Sábado, 5 de setembro de 2026');
    expect(weekdayHeaders()).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
  });
});

describe('bucketTasksByDate / buildDayBuckets', () => {
  const tasks = [
    T('1', '2026-09-10'),
    T('2', '2026-09-10'),
    T('3', null),
    T('4', 'invalida'),
    T('5', '2026-09-11'),
  ];

  it('agrupa por dia ignorando sem-prazo e inválidas', () => {
    const map = bucketTasksByDate(tasks);
    expect(map.get('2026-09-10')?.map((t) => t.id)).toEqual(['1', '2']);
    expect(map.get('2026-09-11')?.map((t) => t.id)).toEqual(['5']);
    expect(map.has('invalida')).toBe(false);
    expect(tasksWithoutDueDate(tasks).map((t) => t.id)).toEqual(['3', '4']);
  });

  it('monta buckets com today/outside para o mês', () => {
    const days = getMonthCells(new Date(2026, 8, 15));
    const buckets = buildDayBuckets(tasks, days, new Date(2026, 8, 15));
    expect(buckets).toHaveLength(42);
    const tenth = buckets.find((b) => b.iso === '2026-09-10');
    expect(tenth?.tasks).toHaveLength(2);
    expect(tenth?.isOutside).toBe(false);
    expect(buckets.find((b) => b.iso === '2026-08-31')?.isOutside).toBe(true);
  });
});
