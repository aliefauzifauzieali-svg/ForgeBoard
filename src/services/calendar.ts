import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task } from '../types';

/**
 * Lógica de calendário sobre `dueDate` (string `yyyy-mm-dd` ou null).
 *
 * ADR — disciplina date-only (prova de timezone/DST):
 * - O prazo é um DIA, não um instante: nunca usamos `new Date('yyyy-mm-dd')`
 *   (meia-noite UTC, que vira o dia anterior a oeste de Greenwich).
 * - Convertemos sempre por partes (`new Date(y, m-1, d)`, meia-noite LOCAL)
 *   e comparamos/formatamos no fuso local. Sem horas em lugar nenhum,
 *   não há como DST ou offset deslocarem um dia.
 * - Semana começa na segunda-feira (padrão pt-BR).
 */

const WEEK_OPTS = { weekStartsOn: 1 } as const;

export type CalendarMode = 'month' | 'week' | 'day';

/** `yyyy-mm-dd` → Date local (meia-noite local). Retorna null se inválido. */
export function parseDateOnly(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return startOfDay(date);
}

/** Date → `yyyy-mm-dd` local. */
export function toDateOnlyString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** 42 células (6 semanas) cobrindo o mês do cursor, começando na segunda. */
export function getMonthCells(cursor: Date): Date[] {
  const start = startOfWeek(startOfMonth(cursor), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(cursor), WEEK_OPTS);
  const days = eachDayOfInterval({ start, end });
  // Garante grade 6x7 estável mesmo em meses curtos (ex.: fev/2021 = 28 dias).
  while (days.length < 42) {
    const last = days[days.length - 1];
    if (!last) break;
    days.push(addDays(last, 1));
  }
  return days;
}

/** 7 dias (seg–dom) da semana do cursor. */
export function getWeekDays(cursor: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(cursor, WEEK_OPTS),
    end: endOfWeek(cursor, WEEK_OPTS),
  });
}

export function shiftCursor(cursor: Date, mode: CalendarMode, dir: 1 | -1): Date {
  if (mode === 'month') return addMonths(cursor, dir);
  if (mode === 'week') return addWeeks(cursor, dir);
  return addDays(cursor, dir);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

/** "Setembro de 2026" — título da visão mensal. */
export function formatMonthTitle(cursor: Date): string {
  return capitalize(format(cursor, "MMMM 'de' yyyy", { locale: ptBR }));
}

/** "31 ago – 6 set 2026" — título da visão semanal. */
export function formatWeekTitle(cursor: Date): string {
  const start = startOfWeek(cursor, WEEK_OPTS);
  const end = endOfWeek(cursor, WEEK_OPTS);
  return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
}

/** "Sábado, 6 de setembro de 2026" — título da visão diária. */
export function formatDayTitle(cursor: Date): string {
  return capitalize(format(cursor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }));
}

/** ["seg", "ter", …] — cabeçalho da grade (v4 retorna por extenso em pt-BR). */
export function weekdayHeaders(): string[] {
  return getWeekDays(new Date(2026, 8, 7)).map((d) =>
    format(d, 'EEE', { locale: ptBR }).slice(0, 3),
  );
}

export interface DayBucket {
  iso: string;
  date: Date;
  isToday: boolean;
  isOutside: boolean;
  tasks: Task[];
}

/**
 * Agrupa tarefas por dia (`yyyy-mm-dd`). Tarefas sem prazo ou com data
 * inválida são ignoradas (não aparecem no calendário).
 */
export function bucketTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const parsed = parseDateOnly(t.dueDate);
    if (!parsed) continue;
    const iso = toDateOnlyString(parsed);
    const list = map.get(iso) ?? [];
    list.push(t);
    map.set(iso, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}

/** Monta os buckets prontos para renderizar (mês, semana ou dia único). */
export function buildDayBuckets(tasks: Task[], days: Date[], monthRef?: Date): DayBucket[] {
  const grouped = bucketTasksByDate(tasks);
  return days.map((date) => {
    const iso = toDateOnlyString(date);
    return {
      iso,
      date,
      isToday: isToday(date),
      isOutside: monthRef ? !isSameMonth(date, monthRef) : false,
      tasks: grouped.get(iso) ?? [],
    };
  });
}

/** Tarefas invisíveis no calendário: sem prazo ou com data inválida. */
export function tasksWithoutDueDate(tasks: Task[]): Task[] {
  return tasks.filter((t) => !parseDateOnly(t.dueDate));
}
