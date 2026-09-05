import type { PrioritySlice } from '../../services/stats';

const SLICE_COLORS: Record<PrioritySlice['priority'], string> = {
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

/** Rosca de distribuição por prioridade (SVG próprio). */
export function PriorityDonut({ items }: { items: PrioritySlice[] }): React.JSX.Element {
  const total = items.reduce((a, b) => a + b.count, 0);
  const R = 44;
  const C = 2 * Math.PI * R;
  const fracs = items.map((s) => (total === 0 ? 0 : s.count / total));
  const offsets = fracs.map((_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0));

  return (
    <figure className="flex items-center gap-4">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Distribuição por prioridade entre ${total} tarefas: ${items
          .map((i) => `${i.count} ${i.label.toLowerCase()}`)
          .join(', ')}.`}
        className="h-28 w-28 shrink-0 sm:h-32 sm:w-32"
      >
        <circle cx={60} cy={60} r={R} fill="none" strokeWidth={18} className="stroke-zinc-200 dark:stroke-zinc-800" />
        {items.map((s, i) => (
          <circle
            key={s.priority}
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke={SLICE_COLORS[s.priority]}
            strokeWidth={18}
            strokeDasharray={`${fracs[i]! * C} ${C}`}
            strokeDashoffset={-(offsets[i] ?? 0) * C}
            transform="rotate(-90 60 60)"
            strokeLinecap="butt"
          >
            <title>{`${s.label}: ${s.count}`}</title>
          </circle>
        ))}
        <text x={60} y={57} textAnchor="middle" fontSize={20} fontWeight={800} fill="currentColor">
          {total}
        </text>
        <text x={60} y={72} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
          tarefas
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {items.map((s) => (
          <li key={s.priority} className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SLICE_COLORS[s.priority] }} />
            <span className="font-semibold">{s.label}</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{s.count}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
