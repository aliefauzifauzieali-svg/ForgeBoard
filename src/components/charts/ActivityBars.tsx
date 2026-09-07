import type { DayCount } from '../../services/stats';

/**
 * Barras de conclusões por dia (SVG próprio, sem lib de gráficos).
 * Com `onSelect`, cada barra vira botão (mouse + teclado) para filtrar.
 */
export function ActivityBars({
  data,
  total,
  selectedIso,
  onSelect,
}: {
  data: DayCount[];
  total: number;
  selectedIso?: string | null;
  onSelect?: (iso: string) => void;
}): React.JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 120;
  const PAD = 22;
  const step = (W - PAD * 2) / data.length;
  const barW = Math.max(4, Math.min(26, step * 0.55));

  return (
    <figure>
      <figcaption className="sr-only">
        {`Conclusões por dia nos últimos ${data.length} dias. Total: ${total}. Pico de ${max} em um dia.`}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full sm:h-32"
      >
        <title>{`Total de ${total} conclusões`}</title>
        {data.map((d, i) => {
          const h = d.count === 0 ? 3 : Math.max(8, ((H - PAD * 2 - 14) * d.count) / max);
          const x = PAD + step * i + (step - barW) / 2;
          const y = H - PAD - h;
          const selected = selectedIso === d.iso;
          const bar = (
            <>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill={d.count === 0 ? undefined : 'var(--accent)'}
                className={d.count === 0 ? 'fill-zinc-300 dark:fill-zinc-700' : undefined}
                opacity={selected ? 1 : d.count === 0 ? 0.6 : 0.85}
                stroke={selected ? 'var(--accent-dark)' : 'none'}
                strokeWidth={selected ? 2 : 0}
              >
                <title>{`${d.label}: ${d.count}`}</title>
              </rect>
              {i % 2 === 0 ? (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                  {d.label}
                </text>
              ) : null}
            </>
          );
          if (!onSelect) return <g key={d.iso}>{bar}</g>;
          return (
            <g
              key={d.iso}
              role="button"
              tabIndex={0}
              aria-label={`Filtrar por ${d.label}: ${d.count} conclusões`}
              aria-pressed={selected}
              className="cursor-pointer"
              onClick={() => onSelect(d.iso)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(d.iso);
                }
              }}
            >
              {bar}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
