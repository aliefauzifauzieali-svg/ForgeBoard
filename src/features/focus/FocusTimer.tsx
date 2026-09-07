import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { cn } from '../../utils/core';
import { BREAK_SEC, FOCUS_SEC, formatClock } from './pomodoro';
import { useFocusTimer } from './useFocusTimer';

/**
 * Widget Modo Foco (Pomodoro 25/5) no Dashboard: iniciar/pausar/reiniciar,
 * troca de modo e contagem de ciclos. Estado em localStorage; notifica
 * (toast + sistema) ao fim de cada ciclo.
 */
export function FocusTimer(): React.JSX.Element {
  const { state, toggle, reset, switchMode } = useFocusTimer();
  const total = state.mode === 'focus' ? FOCUS_SEC : BREAK_SEC;
  const frac = total === 0 ? 0 : Math.max(0, Math.min(1, state.remainingSec / total));
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <section aria-labelledby="focus-heading" className="card card-hover p-4">
      <h2 id="focus-heading" className="flex items-center gap-2 text-sm font-bold tracking-tight">
        <Timer size={16} aria-hidden className="text-[var(--accent)]" />
        Modo Foco
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
          {state.completed} {state.completed === 1 ? 'ciclo' : 'ciclos'}
        </span>
      </h2>
      <div className="mt-3 flex justify-center gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Tipo de ciclo">
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
      <div className="relative mx-auto mt-3 h-44 w-44">
        <svg viewBox="0 0 120 120" role="presentation" className="h-full w-full -rotate-90">
          <circle cx={60} cy={60} r={R} fill="none" strokeWidth={8} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <circle
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            key={state.mode}
            role="timer"
            aria-label={`${state.mode === 'focus' ? 'Foco' : 'Pausa'}: ${formatClock(state.remainingSec)} restantes`}
            className="animate-fade-in text-4xl font-extrabold tabular-nums tracking-tight"
          >
            {formatClock(state.remainingSec)}
          </p>
          <p className="mt-1 px-4 text-center text-[11px] text-zinc-600 dark:text-zinc-400">
            {state.running ? (state.mode === 'focus' ? 'Foque em uma tarefa.' : 'Respire e descanse.') : 'Timer pausado.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={toggle}>
          {state.running ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          {state.running ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={reset}>
          <RotateCcw size={14} aria-hidden /> Reiniciar
        </button>
      </div>
    </section>
  );
}
