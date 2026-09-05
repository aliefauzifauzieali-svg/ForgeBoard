import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ActivityEvent } from '../storage/activity';
import { toDateOnlyString } from './calendar';

export type TimeBucket = 'day' | 'week' | 'month';

export interface BucketCount {
  key: string;
  label: string;
  created: number;
  completed: number;
  /** % concluídas sobre criadas no período (null sem criações). */
  rate: number | null;
}

function startOfBucket(d: Date, bucket: TimeBucket): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  if (bucket === 'week') {
    const dow = (out.getDay() + 6) % 7; // segunda = 0
    out.setDate(out.getDate() - dow);
  } else if (bucket === 'month') {
    out.setDate(1);
  }
  return out;
}

function addBucket(d: Date, bucket: TimeBucket, n: number): Date {
  const out = new Date(d);
  if (bucket === 'day') out.setDate(out.getDate() + n);
  else if (bucket === 'week') out.setDate(out.getDate() + n * 7);
  else out.setMonth(out.getMonth() + n);
  return out;
}

function bucketLabel(d: Date, bucket: TimeBucket): string {
  if (bucket === 'day') return `${d.getDate()}/${d.getMonth() + 1}`;
  if (bucket === 'week') return format(d, 'd MMM', { locale: ptBR });
  return format(d, "MMM yy", { locale: ptBR });
}

export interface ActivityFilter {
  projectId?: string;
  tagId?: string;
}

function inScope(e: ActivityEvent, f: ActivityFilter): boolean {
  if (f.projectId && e.projectId !== f.projectId) return false;
  if (f.tagId && !e.meta?.tagIds?.includes(f.tagId)) return false;
  return true;
}

/**
 * Criadas × concluídas por período (para barras + taxa). Base: eventos
 * `task.created` / `task.completed` — não conta importações em massa
 * (replaceAll não emite eventos, por decisão documentada).
 */
export function activityByBucket(
  events: ActivityEvent[],
  bucket: TimeBucket,
  count: number,
  now: Date = new Date(),
  filter: ActivityFilter = {},
): BucketCount[] {
  const end = startOfBucket(now, bucket);
  const windows: Date[] = [];
  for (let i = count - 1; i >= 0; i--) windows.push(addBucket(end, bucket, -i));

  return windows.map((start) => {
    const next = addBucket(start, bucket, 1);
    const inWindow = events.filter((e) => {
      if (!inScope(e, filter)) return false;
      const at = Date.parse(e.at);
      return !Number.isNaN(at) && at >= start.getTime() && at < next.getTime();
    });
    const created = inWindow.filter((e) => e.type === 'task.created').length;
    const completed = inWindow.filter((e) => e.type === 'task.completed').length;
    return {
      key: toDateOnlyString(start),
      label: bucketLabel(start, bucket),
      created,
      completed,
      rate: created > 0 ? Math.round((completed / created) * 100) : null,
    };
  });
}

export interface ProjectSeries {
  projectId: string;
  name: string;
  points: Array<{ iso: string; label: string; cumulative: number }>;
}

/** Evolução acumulada de conclusões por projeto (últimos `days` dias). */
export function projectProgressSeries(
  events: ActivityEvent[],
  projects: Array<{ id: string; name: string }>,
  days = 30,
  now: Date = new Date(),
): ProjectSeries[] {
  const end = startOfBucket(now, 'day');
  const daysList: Date[] = [];
  for (let i = days - 1; i >= 0; i--) daysList.push(addBucket(end, 'day', -i));

  return projects.map((p) => {
    const doneAt = events
      .filter((e) => e.type === 'task.completed' && e.projectId === p.id)
      .map((e) => Date.parse(e.at))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
    let acc = 0;
    let cursor = 0;
    // Conclusões anteriores à janela já contam no ponto inicial.
    while (cursor < doneAt.length && doneAt[cursor]! < daysList[0]!.getTime()) {
      acc += 1;
      cursor += 1;
    }
    const points = daysList.map((d) => {
      const endOfDay = d.getTime() + 86_400_000;
      while (cursor < doneAt.length && doneAt[cursor]! < endOfDay) {
        acc += 1;
        cursor += 1;
      }
      return { iso: toDateOnlyString(d), label: `${d.getDate()}/${d.getMonth() + 1}`, cumulative: acc };
    });
    return { projectId: p.id, name: p.name, points };
  });
}

export interface LeadTime {
  averageDays: number | null;
  completed: number;
}

/** Lead time médio unindo `task.created` → `task.completed` por entidade. */
export function leadTimeFromEvents(events: ActivityEvent[]): LeadTime {
  const created = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'task.created') continue;
    const at = Date.parse(e.at);
    if (Number.isNaN(at)) continue;
    const prev = created.get(e.entityId);
    if (prev === undefined || at < prev) created.set(e.entityId, at);
  }
  const samples: number[] = [];
  for (const e of events) {
    if (e.type !== 'task.completed') continue;
    const start = created.get(e.entityId);
    const end = Date.parse(e.at);
    if (start === undefined || Number.isNaN(end) || end < start) continue;
    samples.push((end - start) / 86_400_000);
  }
  if (samples.length === 0) return { averageDays: null, completed: 0 };
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { averageDays: Math.round(avg * 10) / 10, completed: samples.length };
}
