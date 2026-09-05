export function toDateOnly(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function toDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  const due = new Date(`${dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < startOfToday().getTime();
}
