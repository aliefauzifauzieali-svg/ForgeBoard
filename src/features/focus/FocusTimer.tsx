import { Crosshair, Flame, Pause, Play, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '../../utils/core';
import { minutesByDay, minutesToday, readSessions } from '../../services/focusSessions';
import { useBoardStore } from '../../stores/useBoardStore';
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
  const { state, toggle, reset, switchMode, setTask } = useFocusTimer();
  const tasks = useBoardStore((s) => s.tasks);
  const projects = useBoardStore((s) => s.projects);
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
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);
  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name] as const)), [projects]);
  // Recarrega quando um ciclo conclui (completed muda no mesmo tick do registro).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- completed é chave intencional de refresh, não dependência de cálculo
  const sessions = useMemo(() => readSessions(), [state.completed]);
  const todayMinutes = useMemo(() => minutesToday(sessions), [sessions]);
  const week = useMemo(() => minutesByDay(sessions, 7), [sessions]);
  const weekMax = Math.max(1, ...week.map((d) => d.minutes));
  const history = sessions.slice(0, 5);

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

      <div className="mx-auto mt-3 max-w-xs">
        <label className="label" htmlFor="focus-task">
          Tarefa vinculada
        </label>
        <select
          id="focus-task"
          className="input !py-2 text-sm"
          value={state.taskId ?? ''}
          onChange={(e) => setTask(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">Nenhuma (livre)</option>
          {openTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {projectName.get(t.projectId) ? ` · ${projectName.get(t.projectId)}` : ''}
            </option>
          ))}
        </select>
      </div>

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

      <div className="mx-auto mt-4 max-w-xs">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Hoje</span>
          <strong className="tabular-nums">
            {todayMinutes}min · {week[6]?.sessions ?? 0} {week[6]?.sessions === 1 ? 'sessão' : 'sessões'}
          </strong>
        </div>
        <div className="flex h-12 items-end gap-1" role="img" aria-label={`Minutos de foco nos últimos 7 dias: ${week.map((d) => `${d.label}: ${d.minutes}`).join(', ')}.`}>
          {week.map((d) => (
            <div
              key={d.key}
              title={`${d.label}: ${d.minutes}min · ${d.sessions} ${d.sessions === 1 ? 'sessão' : 'sessões'}`}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(6, Math.round((d.minutes / weekMax) * 100))}%`,
                backgroundColor: d.minutes > 0 ? from : 'var(--accent)',
                opacity: d.minutes > 0 ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        {history.length > 0 ? (
          <ul className="mt-3 space-y-1.5" aria-label="Últimas sessões">
            {history.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">
                  {s.taskTitle ?? 'Sem tarefa'}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {new Date(s.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {Math.round(s.durationSec / 60)}min
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
