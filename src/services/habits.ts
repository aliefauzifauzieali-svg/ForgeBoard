import type { Habit } from '../types';

/** `yyyy-mm-dd` local a partir de Date. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Últimos `n` dias como ISO (mais antigo → hoje). Puro e testável. */
export function lastNDays(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

/** Dia local (yyyy-mm-dd) da criação — createdAt é ISO UTC, o agenda é local. */
function createdLocalDay(habit: Habit): string {
  const t = new Date(habit.createdAt).getTime();
  return Number.isNaN(t) ? habit.createdAt.slice(0, 10) : isoDay(new Date(t));
}

/** O hábito vale neste dia? (nunca antes da criação). Puro e testável. */
export function isScheduledOn(habit: Habit, iso: string): boolean {
  if (iso < createdLocalDay(habit)) return false;
  if (habit.schedule.kind === 'daily') return true;
  const days = habit.schedule.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (days.length === 0) return true;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return days.includes(new Date(y, m - 1, d).getDay());
}
