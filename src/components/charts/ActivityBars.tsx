import type { DayCount } from '../../services/stats';

/** Barras de conclusões por dia (SVG próprio, sem lib de gráficos). */
export function ActivityBars({ data, total }: { data: DayCount[]; total: number }): React.JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 120;
  const PAD = 22;
  const step = (W - PAD * 2) / data.length;
  const barW = Math.max(4, Math.min(26, step * 0.55));

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Conclusões por dia nos últimos ${data.length} dias. Total: ${total}. Pico de ${max} em um dia.`}
        className="h-28 w-full sm:h-32"
      >
        <title>{`Total de ${total} conclusões`}</title>
        {data.map((d, i) => {
          const h = d.count === 0 ? 3 : Math.max(8, ((H - PAD * 2 - 14) * d.count) / max);
          const x = PAD + step * i + (step - barW) / 2;
          const y = H - PAD - h;
          return (
            <g key={d.iso}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill={d.count === 0 ? '#d4d4d8' : '#6366f1'}
                opacity={d.count === 0 ? 0.6 : 1}
              >
                <title>{`${d.label}: ${d.count}`}</title>
              </rect>
              {i % 2 === 0 ? (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
