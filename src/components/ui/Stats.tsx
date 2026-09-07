import { cn } from '../../utils/core';

export function ProgressBar({
  percent,
  color = '#6366f1',
  label,
}: {
  percent: number;
  color?: string;
  label?: string;
}): React.JSX.Element {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
        aria-label={label ?? `Progresso: ${safe}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${safe}%`, backgroundColor: color }}
        />
      </div>
      <span className="sr-only">{safe}% concluído</span>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}): React.JSX.Element {
  return (
    <div className="card animate-fade-up p-4 transition-shadow hover:shadow-pop">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            accent ?? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] dark:text-[var(--accent-bright)]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}
