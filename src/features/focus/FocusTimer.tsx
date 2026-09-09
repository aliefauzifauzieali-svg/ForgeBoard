import { Crosshair, Flame, Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/core';
import { BREAK_SEC, FOCUS_SEC, formatClock } from './pomodoro';
import { useFocusTimer } from './useFocusTimer';

const FOCUS_GRAD = ['#FF6B6B', '#FF8A65'];
const BREAK_GRAD = ['#34D399', '#6EE7B7'];

/**
 * Widget Modo Foco (Pomodoro 25/5) no Dashboard: iniciar/pausar/reiniciar,
 * troca de modo e contagem de ciclos. Estado em localStorage; notifica
 * (toast + sistema) ao fim de cada ciclo. Visual segue a referência
 * Pomodoro (anel quente, timer gigante, stats laterais, START em pílula).
 */
export function FocusTimer(): React.JSX.Element {
  const { state, toggle, reset, switchMode } = useFocusTimer();
  const focus = state.mode === 'focus';
  const total = focus ? FOCUS_SEC : BREAK_SEC;
  const frac = total === 0 ? 0 : Math.max(0, Math.min(1, state.remainingSec / total));
  const [from, to] = focus ? FOCUS_GRAD : BREAK_GRAD;
  const R = 52;
  const C = 2 * Math.PI * R;
  // Ponto na ponta do progresso (anel sem rotação: 0 = topo).
  const tipAngle = -Math.PI / 2 + frac * 2 * Math.PI;
  const tipX = 60 + R * Math.cos(tipAngle);
  const tipY = 60 + R * Math.sin(tipAngle);
  const focusMinutes = state.completed * 25;

  return (
    <section aria-labelledby="focus-heading" className="card card-hover p-4 sm:p-5">
      <h2
        id="focus-heading"
        className="text-center text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400"
      >
        Modo Foco
      </h2>

      <div className="mt-3 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 grid grid-cols-2 gap-2 sm:order-1 sm:grid-cols-1">
          <div className="rounded-xl border border-zinc-200/80 px-3 py-2.5 text-center dark:border-white/[0.07] dark:bg-white/[0.02]">
            <Crosshair size={16} aria-hidden className="mx-auto" style={{ color: from }} />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Sessões
            </p>
            <p className="text-2xl font-extrabold tabular-nums leading-tight">{state.completed}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">concluídas</p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 px-3 py-2.5 text-center dark:border-white/[0.07] dark:bg-white/[0.02]">
            <Flame size={16} aria-hidden className="mx-auto text-orange-500" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Foco
            </p>
            <p className="text-2xl font-extrabold tabular-nums leading-tight">{focusMinutes}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">minutos</p>
          </div>
        </div>

        <div className="relative order-1 mx-auto h-52 w-52 sm:order-2">
          <svg viewBox="0 0 120 120" role="presentation" className="h-full w-full">
            <defs>
              <linearGradient id="focus-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={from} />
                <stop offset="1" stopColor={to} />
              </linearGradient>
            </defs>
            <circle cx={60} cy={60} r={R} fill="none" strokeWidth={8} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <circle
              cx={60}
              cy={60}
              r={R}
              fill="none"
              stroke="url(#focus-ring-grad)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${frac * C} ${C}`}
              transform="rotate(-90 60 60)"
            />
            {frac > 0 ? <circle cx={tipX} cy={tipY} r={4} fill={from} /> : null}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              {focus ? 'Focus time' : 'Break time'}
            </p>
            <p
              key={state.mode}
              role="timer"
              aria-label={`${focus ? 'Foco' : 'Pausa'}: ${formatClock(state.remainingSec)} restantes`}
              className="animate-fade-in text-5xl font-bold tabular-nums leading-none tracking-tight"
            >
              {formatClock(state.remainingSec)}
            </p>
          </div>
        </div>

        <div className="order-3 hidden sm:block" aria-hidden>
          {/* Coluna fantasma: mantém o anel centralizado no grid desktop. */}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-zinc-600 dark:text-zinc-400">
        {state.running ? (focus ? 'Foque em uma tarefa.' : 'Respire e descanse.') : 'Timer pausado.'}
      </p>

      <div className="mt-3 flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          style={{ backgroundColor: from, boxShadow: `0 8px 24px -6px ${from}66` }}
          className="inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold uppercase tracking-widest text-zinc-950 transition duration-200 ease-spring hover:brightness-110 active:scale-[0.98]"
        >
          {state.running ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {state.running ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reiniciar"
          title="Reiniciar"
          className="icon-btn !h-10 !w-10 !rounded-full border border-zinc-300 dark:border-zinc-700"
        >
          <RotateCcw size={16} aria-hidden />
        </button>
      </div>

      <div className="mx-auto mt-3 flex max-w-xs justify-center gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Tipo de ciclo">
        {(['focus', 'break'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={state.mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98]',
              state.mode === m
                ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            {m === 'focus' ? 'Foco · 25min' : 'Pausa · 5min'}
          </button>
        ))}
      </div>
    </section>
  );
}
