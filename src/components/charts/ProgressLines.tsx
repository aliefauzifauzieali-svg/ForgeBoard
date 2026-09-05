import type { ProjectSeries } from '../../services/activityStats';

const LINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

/** Evolução acumulada de conclusões por projeto (SVG próprio, multilinha). */
export function ProgressLines({ series }: { series: ProjectSeries[] }): React.JSX.Element {
  const W = 560;
  const H = 180;
  const PAD_L = 30;
  const PAD = 14;
  const n = series[0]?.points.length ?? 0;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.cumulative)));
  const x = (i: number): number => PAD_L + (i * (W - PAD_L - PAD)) / Math.max(1, n - 1);
  const y = (v: number): number => H - PAD - ((H - PAD * 2 - 14) * v) / max;
  const ticks = max === 1 ? [0, 1] : [0, Math.ceil(max / 2), max];
  const every = Math.max(1, Math.ceil(n / 7));
  const summary = series.map((s) => `${s.name}: ${s.points[s.points.length - 1]?.cumulative ?? 0}`).join('; ');

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Evolução acumulada de conclusões por projeto. ${summary}.`}
        className="h-44 w-full sm:h-48"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD} y1={y(t)} y2={y(t)} stroke="currentColor" opacity={0.15} />
            <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {t}
            </text>
          </g>
        ))}
        {series.map((s, si) => (
          <g key={s.projectId}>
            <title>{`${s.name}: ${s.points[s.points.length - 1]?.cumulative ?? 0} conclusões`}</title>
            <polyline
              fill="none"
              stroke={LINE_COLORS[si % LINE_COLORS.length]}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points.map((p, i) => `${x(i)},${y(p.cumulative)}`).join(' ')}
            />
          </g>
        ))}
        {series[0]?.points.map((p, i) =>
          i % every === 0 ? (
            <text key={p.iso} x={x(i)} y={H - 2} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
              {p.label}
            </text>
          ) : null,
        ) ?? null}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legenda">
        {series.map((s, si) => (
          <li key={s.projectId} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: LINE_COLORS[si % LINE_COLORS.length] }}
            />
            <span className="font-semibold">{s.name}</span>
            <span className="tabular-nums text-zinc-500">{s.points[s.points.length - 1]?.cumulative ?? 0}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
