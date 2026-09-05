import type { Task, TaskPriority } from '../types';
import { TASK_PRIORITIES } from '../types';
import { PRIORITY_META } from '../utils/constants';
import { toDateOnlyString } from './calendar';

export interface DayCount {
  iso: string;
  /** "5/9" */
  label: string;
  count: number;
}

/**
 * Conclusões por dia nos últimos `days` dias (base: `completedAt`, que só
 * existe enquanto a tarefa está concluída — histórico honesto).
 */
export function completionsPerDay(tasks: Task[], days = 14, now: Date = new Date()): DayCount[] {
  const perDay = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== 'done' || !t.completedAt) continue;
    const doneAt = new Date(t.completedAt);
    if (Number.isNaN(doneAt.getTime())) continue;
    const iso = toDateOnlyString(doneAt);
    perDay.set(iso, (perDay.get(iso) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = toDateOnlyString(d);
    out.push({ iso, label: `${d.getDate()}/${d.getMonth() + 1}`, count: perDay.get(iso) ?? 0 });
  }
  return out;
}

export interface PrioritySlice {
  priority: TaskPriority;
  label: string;
  count: number;
}

/** Distribuição atual por prioridade (ordem fixa baixa → crítica). */
export function priorityDistribution(tasks: Task[]): PrioritySlice[] {
  return TASK_PRIORITIES.map((priority) => ({
    priority,
    label: PRIORITY_META[priority].label,
    count: tasks.filter((t) => t.priority === priority).length,
  }));
}

export interface LeadTime {
  /** Média em dias (createdAt → completedAt) ou null sem amostra. */
  averageDays: number | null;
  completed: number;
}

/** Lead time médio das concluídas com datas válidas. */
export function leadTimeStats(tasks: Task[]): LeadTime {
  const samples: number[] = [];
  for (const t of tasks) {
    if (t.status !== 'done' || !t.completedAt) continue;
    const start = Date.parse(t.createdAt);
    const end = Date.parse(t.completedAt);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    samples.push((end - start) / 86_400_000);
  }
  if (samples.length === 0) return { averageDays: null, completed: 0 };
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { averageDays: Math.round(avg * 10) / 10, completed: samples.length };
}

/** % concluídas sobre o total (0 sem tarefas). */
export function completionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100);
}
