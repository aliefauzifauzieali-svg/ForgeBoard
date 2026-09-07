import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../../types';
import { PRIORITY_META, STATUS_META } from '../../utils/constants';
import { cn } from '../../utils/core';

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
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
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        PRIORITY_STYLE[value],
      )}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden />
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
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {color ? (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      #{label}
    </span>
  );
}
