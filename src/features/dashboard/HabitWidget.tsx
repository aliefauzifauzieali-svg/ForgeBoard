import { Check } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { cn } from '../../utils/core';
import { isScheduledOn, isoDay } from '../../services/habits';
import { useHabitStore } from '../../stores/useHabitStore';
import { useUIStore } from '../../stores/useUIStore';

/** Widget do Dashboard: check-in rápido dos hábitos de hoje. */
export function HabitWidget(): React.JSX.Element {
  const hydrate = useHabitStore((s) => s.hydrate);
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const toggleDone = useHabitStore((s) => s.toggleDone);
  const goHabits = useUIStore((s) => s.goHabits);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const today = useMemo(() => isoDay(new Date()), []);
  const todayList = useMemo(
    () => habits.filter((h) => !h.archived && isScheduledOn(h, today)).slice(0, 5),
    [habits, today],
  );
  const doneCount = todayList.filter((h) => (completions[h.id] ?? []).includes(today)).length;

  return (
    <section aria-labelledby="habits-heading" className="card card-hover p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="habits-heading" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
          Hábitos de hoje
        </h2>
        {todayList.length > 0 ? (
          <span className="text-xs font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
            {doneCount}/{todayList.length}
          </span>
        ) : null}
      </div>
      {todayList.length === 0 ? (
        <div className="mt-3 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhum hábito hoje.</p>
          <button type="button" className="btn-secondary mt-2 !py-1.5 text-xs" onClick={goHabits}>
            Criar hábito
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {todayList.map((h) => {
            const done = (completions[h.id] ?? []).includes(today);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  aria-pressed={done}
                  onClick={() => toggleDone(h.id, today)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-100 active:scale-[0.99] dark:hover:bg-white/[0.04]"
                >
                  <span
                    aria-hidden
                    style={done ? { backgroundColor: h.color ?? 'var(--accent)', borderColor: 'transparent' } : undefined}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                      done ? 'text-white' : 'border-zinc-300 dark:border-zinc-600',
                    )}
                  >
                    {done ? <Check size={13} /> : null}
                  </span>
                  <span className={cn('min-w-0 flex-1 truncate text-sm', done && 'text-zinc-500 line-through dark:text-zinc-500')}>
                    {h.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {todayList.length > 0 ? (
        <button
          type="button"
          onClick={goHabits}
          className="mt-2 w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Ver todos →
        </button>
      ) : null}
    </section>
  );
}
