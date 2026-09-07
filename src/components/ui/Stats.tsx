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
          className="h-full rounded-full transition-[width] duration-500 ease-out"
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
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  /** Mini-série para sparkline (ex.: conclusões por dia). */
  spark?: number[];
}): React.JSX.Element {
  const max = Math.max(1, ...(spark ?? [1]));
  const pts = (spark ?? [])
    .map((v, i, a) => `${(i * 96) / Math.max(1, a.length - 1)},${26 - (v / max) * 22}`)
    .join(' ');
  return (
    <div className="card card-hover group animate-fade-up p-4">
      <div className="flex flex-col items-start gap-2">
        <span
          aria-hidden
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 ease-spring group-hover:scale-105',
            accent ?? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] dark:text-[var(--accent-bright)]',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p
            title={label}
            className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
          >
            {label}
          </p>
          <p className="text-4xl font-bold tabular-nums leading-tight tracking-tight">{value}</p>
        </div>
      </div>
      {pts ? (
        <svg viewBox="0 0 96 28" aria-hidden className="mt-2 h-7 w-full">
          <polyline
            points={pts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        </svg>
      ) : null}
      {hint ? <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}
