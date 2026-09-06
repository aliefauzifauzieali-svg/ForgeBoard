import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react';
import type { Subtask } from '../../types';
import { generateId, nowIso } from '../../utils/core';

/** Máximo de subtarefas por tarefa. */
export const MAX_SUBTASKS = 20;

/**
 * Editor de checklist da tarefa: adicionar, renomear, concluir, excluir e
 * reordenar. Edita uma cópia local; o pai salva via `updateTask`.
 */
export function SubtaskEditor({
  value,
  onChange,
}: {
  value: Subtask[];
  onChange: (next: Subtask[]) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const done = value.filter((s) => s.done).length;

  const add = (): void => {
    const title = draft.trim().slice(0, 140);
    if (!title || value.length >= MAX_SUBTASKS) return;
    onChange([...value, { id: generateId(), title, done: false, createdAt: nowIso() }]);
    setDraft('');
  };

  const patch = (id: string, fn: (s: Subtask) => Subtask): void => {
    onChange(value.map((s) => (s.id === id ? fn(s) : s)));
  };

  const move = (id: string, dir: -1 | 1): void => {
    const i = value.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= value.length) return;
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item!);
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="label">
        Subtarefas{value.length > 0 ? ` (${done}/${value.length})` : ''}
      </legend>
      {value.length > 0 ? (
        <ul className="space-y-1.5">
          {value.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={s.done}
                aria-label={s.done ? `Reabrir subtarefa ${s.title}` : `Concluir subtarefa ${s.title}`}
                onClick={() => patch(s.id, (x) => ({ ...x, done: !x.done }))}
                className="icon-btn !h-7 !w-7 shrink-0"
              >
                {s.done ? <Check size={15} aria-hidden className="text-emerald-600 dark:text-emerald-400" /> : <span aria-hidden className="h-3.5 w-3.5 rounded border border-zinc-400 dark:border-zinc-600" />}
              </button>
              <label htmlFor={`sub-${s.id}`} className="sr-only">
                Título da subtarefa {i + 1}
              </label>
              <input
                id={`sub-${s.id}`}
                className="input !py-1.5 text-sm"
                value={s.title}
                maxLength={140}
                onChange={(e) => patch(s.id, (x) => ({ ...x, title: e.target.value.slice(0, 140) }))}
              />
              <button
                type="button"
                disabled={i === 0}
                aria-label={`Mover subtarefa ${s.title} para cima`}
                onClick={() => move(s.id, -1)}
                className="icon-btn !h-7 !w-7 shrink-0 disabled:opacity-30"
              >
                <ArrowUp size={14} aria-hidden />
              </button>
              <button
                type="button"
                disabled={i === value.length - 1}
                aria-label={`Mover subtarefa ${s.title} para baixo`}
                onClick={() => move(s.id, 1)}
                className="icon-btn !h-7 !w-7 shrink-0 disabled:opacity-30"
              >
                <ArrowDown size={14} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Excluir subtarefa ${s.title}`}
                onClick={() => onChange(value.filter((x) => x.id !== s.id))}
                className="icon-btn !h-7 !w-7 shrink-0 hover:!text-red-600"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length >= MAX_SUBTASKS ? (
        <p className="mt-1 text-xs text-zinc-500">Máximo de {MAX_SUBTASKS} subtarefas.</p>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <label htmlFor="new-subtask" className="sr-only">
            Nova subtarefa
          </label>
          <input
            id="new-subtask"
            className="input !py-1.5 text-sm"
            value={draft}
            maxLength={140}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Nova subtarefa…"
          />
          <button
            type="button"
            className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
            disabled={!draft.trim()}
            onClick={add}
          >
            <Plus size={14} aria-hidden /> Adicionar
          </button>
        </div>
      )}
    </fieldset>
  );
}
