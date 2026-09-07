import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../../types';
import { PRIORITY_META, STATUS_META } from '../../utils/constants';
import { cn } from '../../utils/core';

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: 'text-sky-600 dark:text-sky-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
};

const PRIORITY_ICON = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  critical: AlertTriangle,
} as const;

export function PriorityBadge({ value }: { value: TaskPriority }): React.JSX.Element {
  const Icon = PRIORITY_ICON[value];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden className={PRIORITY_TEXT[value]} />
      {PRIORITY_META[value].label}
    </span>
  );
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  backlog: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  'in-progress': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export function StatusBadge({ value }: { value: TaskStatus }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        STATUS_STYLE[value],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          value === 'backlog' && 'bg-zinc-500',
          value === 'in-progress' && 'bg-[var(--accent)]',
          value === 'done' && 'bg-emerald-500',
        )}
      />
      {STATUS_META[value].label}
    </span>
  );
}

export function TagChip({ label, color }: { label: string; color?: string }): React.JSX.Element {
  return (
    <span
      title={`#${label}`}
      className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
    >
      {color ? (
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      <span className="truncate">#{label}</span>
    </span>
  );
}
