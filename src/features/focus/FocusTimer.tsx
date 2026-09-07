import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { cn } from '../../utils/core';
import { formatClock } from './pomodoro';
import { useFocusTimer } from './useFocusTimer';

/**
 * Widget Modo Foco (Pomodoro 25/5) no Dashboard: iniciar/pausar/reiniciar,
 * troca de modo e contagem de ciclos. Estado em localStorage; notifica
 * (toast + sistema) ao fim de cada ciclo.
 */
export function FocusTimer(): React.JSX.Element {
  const { state, toggle, reset, switchMode } = useFocusTimer();

  return (
    <section aria-labelledby="focus-heading" className="card p-4">
      <h2 id="focus-heading" className="flex items-center gap-2 text-sm font-bold">
        <Timer size={16} aria-hidden className="text-[var(--accent)]" />
        Modo Foco
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
          {state.completed} {state.completed === 1 ? 'ciclo' : 'ciclos'}
        </span>
      </h2>
      <div className="mt-2 flex gap-1.5" role="group" aria-label="Tipo de ciclo">
        {(['focus', 'break'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={state.mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-semibold transition',
              state.mode === m
                ? 'bg-[var(--accent)] text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
            )}
          >
            {m === 'focus' ? 'Foco · 25min' : 'Pausa · 5min'}
          </button>
        ))}
      </div>
      <p
        role="timer"
        aria-label={`${state.mode === 'focus' ? 'Foco' : 'Pausa'}: ${formatClock(state.remainingSec)} restantes`}
        className="mt-3 text-center text-4xl font-extrabold tabular-nums tracking-tight"
      >
        {formatClock(state.remainingSec)}
      </p>
      <p className="mt-1 text-center text-xs text-zinc-600 dark:text-zinc-400">
        {state.running ? (state.mode === 'focus' ? 'Foque em uma tarefa.' : 'Respire e descanse.') : 'Timer pausado.'}
      </p>
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
