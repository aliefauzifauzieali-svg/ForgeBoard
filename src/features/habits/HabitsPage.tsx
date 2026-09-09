import { Archive, Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/core';
import { isScheduledOn, isoDay, lastNDays } from '../../services/habits';
import { useHabitStore } from '../../stores/useHabitStore';
import type { Habit } from '../../types';

const PALETTE = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function HabitForm({ onDone }: { onDone: () => void }): React.JSX.Element {
  const createHabit = useHabitStore((s) => s.createHabit);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'daily' | 'weekly'>('daily');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState('');

  const save = (): void => {
    if (name.trim() === '') {
      setError('Dê um nome ao hábito.');
      return;
    }
    createHabit({
      name,
      color,
      schedule: kind === 'daily' ? { kind: 'daily' } : { kind: 'weekly', days: [...days].sort((a, b) => a - b) },
    });
    onDone();
  };

  return (
    <div className="card mb-4 p-4">
      <div>
        <label className="label" htmlFor="habit-name">Nome</label>
        <input
          id="habit-name"
          className="input"
          value={name}
          maxLength={80}
          placeholder="Ex.: Ler 20 páginas"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-3">
        <span className="label" id="habit-freq">Frequência</span>
        <div className="flex gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-labelledby="habit-freq">
          {(['daily', 'weekly'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]',
                kind === k
                  ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {k === 'daily' ? 'Todo dia' : 'Dias da semana'}
            </button>
          ))}
        </div>
      </div>
      {kind === 'weekly' ? (
        <fieldset className="mt-3">
          <legend className="label">Dias</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, d) => {
              const on = days.includes(d);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                  className={cn(
                    'h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition active:scale-95',
                    on
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="mt-3">
        <legend className="label">Cor</legend>
        <div className="flex gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={cn(
                'h-7 w-7 rounded-full transition active:scale-95',
                color === c && 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900',
              )}
            />
          ))}
        </div>
      </fieldset>
      {error !== '' ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary flex-1" onClick={save}>Criar hábito</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

function DayStrip({ habit, days, today }: { habit: Habit; days: string[]; today: string }): React.JSX.Element {
  const completions = useHabitStore((s) => s.completions);
  const toggleDone = useHabitStore((s) => s.toggleDone);
  const done = new Set(completions[habit.id] ?? []);
  return (
    <div className="mt-2 flex gap-1 overflow-x-auto pb-1" role="group" aria-label={`Últimos ${days.length} dias: ${habit.name}`}>
      {days.map((iso) => {
        const scheduled = isScheduledOn(habit, iso);
        const isDone = done.has(iso);
        const isToday = iso === today;
        const [dd, mm] = [iso.slice(8, 10), iso.slice(5, 7)];
        const label = `${dd}/${mm}${isToday ? ' (hoje)' : ''}: ${isDone ? 'feito' : scheduled ? 'pendente' : 'fora da agenda'}`;
        return (
          <button
            key={iso}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isDone}
            disabled={!scheduled || iso > today}
            onClick={() => toggleDone(habit.id, iso)}
            style={isDone ? { backgroundColor: habit.color ?? 'var(--accent)' } : undefined}
            className={cn(
              'h-5 w-5 shrink-0 rounded-md transition active:scale-90 disabled:cursor-default disabled:opacity-100',
              !isDone && scheduled && 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600',
              !scheduled && 'bg-transparent',
              isToday && 'ring-2 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 dark:ring-offset-zinc-900',
              isToday && !isDone && 'bg-zinc-300 dark:bg-zinc-600',
            )}
          />
        );
      })}
    </div>
  );
}

function HabitRow({ habit, today, days }: { habit: Habit; today: string; days: string[] }): React.JSX.Element {
  const doneToday = useHabitStore((s) => (s.completions[habit.id] ?? []).includes(today));
  const toggleDone = useHabitStore((s) => s.toggleDone);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(habit.name);
  const done = doneToday && isScheduledOn(habit, today);

  const commitRename = (): void => {
    if (draft.trim() !== '') updateHabit(habit.id, { name: draft });
    else setDraft(habit.name);
    setRenaming(false);
  };

  return (
    <li className="rounded-xl border border-zinc-200/80 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Desmarcar ${habit.name} hoje` : `Concluir ${habit.name} hoje`}
          onClick={() => toggleDone(habit.id, today)}
          style={done ? { backgroundColor: habit.color ?? 'var(--accent)', borderColor: 'transparent' } : undefined}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90',
            done ? 'text-white' : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-600',
          )}
        >
          {done ? <Check size={16} aria-hidden /> : null}
        </button>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus -- fluxo explícito de renomear
              autoFocus
              className="input !py-1 text-sm"
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraft(habit.name);
                  setRenaming(false);
                }
              }}
              aria-label="Renomear hábito"
            />
          ) : (
            <p className={cn('truncate text-sm font-semibold', done && 'text-zinc-500 line-through dark:text-zinc-500')}>
              {habit.name}
            </p>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {habit.schedule.kind === 'daily'
              ? 'Todo dia'
              : habit.schedule.days.length === 0
                ? 'Todo dia'
                : habit.schedule.days.map((d) => WEEKDAYS[d]).join(' · ')}
          </p>
        </div>
        {habit.archived ? (
          <button type="button" className="icon-btn" title="Reativar" aria-label={`Reativar ${habit.name}`} onClick={() => archiveHabit(habit.id, false)}>
            <RotateCcw size={15} aria-hidden />
          </button>
        ) : (
          <>
            <button type="button" className="icon-btn" title="Renomear" aria-label={`Renomear ${habit.name}`} onClick={() => { setDraft(habit.name); setRenaming(true); }}>
              <Pencil size={15} aria-hidden />
            </button>
            <button type="button" className="icon-btn" title="Arquivar" aria-label={`Arquivar ${habit.name}`} onClick={() => archiveHabit(habit.id, true)}>
              <Archive size={15} aria-hidden />
            </button>
          </>
        )}
        <button
          type="button"
          className="icon-btn hover:!text-red-500"
          title="Excluir"
          aria-label={`Excluir ${habit.name}`}
          onClick={() => {
            if (window.confirm(`Excluir o hábito "${habit.name}" e seu histórico?`)) deleteHabit(habit.id);
          }}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
      {!habit.archived ? <DayStrip habit={habit} days={days} today={today} /> : null}
    </li>
  );
}

/** Página de hábitos (Fase 18.2): check-in diário + grade de 30 dias. */
export function HabitsPage(): React.JSX.Element {
  const hydrate = useHabitStore((s) => s.hydrate);
  const habits = useHabitStore((s) => s.habits);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const today = useMemo(() => isoDay(new Date()), []);
  const days = useMemo(() => lastNDays(30), []);
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const archived = useMemo(() => habits.filter((h) => h.archived), [habits]);
  const todayList = useMemo(() => active.filter((h) => isScheduledOn(h, today)), [active, today]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Hábitos</h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {todayList.length === 0
              ? 'Nada agendado para hoje. Que tal criar um?'
              : `${todayList.length} ${todayList.length === 1 ? 'hábito' : 'hábitos'} na agenda de hoje.`}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
          <Plus size={16} aria-hidden /> Novo hábito
        </button>
      </div>

      {showForm ? <HabitForm onDone={() => setShowForm(false)} /> : null}

      {active.length === 0 && !showForm ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nenhum hábito ainda. Pequenas repetições diárias constroem grandes resultados.
          </p>
        </div>
      ) : null}

      <ul className="space-y-2.5" aria-label="Hábitos ativos">
        {active.map((h) => (
          <HabitRow key={h.id} habit={h} today={today} days={days} />
        ))}
      </ul>

      {archived.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            {showArchived ? 'Ocultar' : 'Mostrar'} arquivados ({archived.length})
          </button>
          {showArchived ? (
            <ul className="mt-2 space-y-2.5 opacity-70" aria-label="Hábitos arquivados">
              {archived.map((h) => (
                <HabitRow key={h.id} habit={h} today={today} days={days} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
