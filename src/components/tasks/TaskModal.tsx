import { useMemo, useState } from 'react';
import { TASK_PRIORITIES, TASK_STATUSES, type RecurrenceKind, type Subtask, type TaskPriority, type TaskStatus } from '../../types';
import { RECURRENCE_META } from '../../services/recurrence';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { PRIORITY_META, STATUS_META } from '../../utils/constants';
import { parseTags } from '../../utils/core';
import { toDateTime } from '../../utils/date';
import { Modal } from '../ui/Modal';
import { SubtaskEditor } from './SubtaskEditor';

export function TaskModal(): React.JSX.Element {
  const taskModal = useUIStore((s) => s.taskModal);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);
  const tasks = useBoardStore((s) => s.tasks);
  const editing = tasks.find((t) => t.id === taskModal.editingId) ?? null;
  // O formulário remonta a cada abertura (via `key`): estado sempre limpo.
  // O Modal permanece montado para permitir a animação de saída.
  const formKey = taskModal.open
    ? `task-${taskModal.editingId ?? taskModal.presetProjectId ?? 'new'}-${taskModal.presetStatus ?? ''}`
    : 'task-closed';
  const newDescription = useIsTouchDevice()
    ? 'Descreva o trabalho a ser feito.'
    : 'Descreva o trabalho a ser feito. (atalho: N)';

  return (
    <Modal
      open={taskModal.open}
      title={editing ? 'Editar tarefa' : 'Nova tarefa'}
      description={editing ? 'Ajuste os detalhes da tarefa.' : newDescription}
      onClose={closeTaskModal}
      wide
    >
      <TaskForm key={formKey} />
    </Modal>
  );
}

function TaskForm(): React.JSX.Element {
  const taskModal = useUIStore((s) => s.taskModal);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const createTask = useBoardStore((s) => s.createTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const openNewProject = useUIStore((s) => s.openNewProject);

  const editing = useMemo(
    () => tasks.find((t) => t.id === taskModal.editingId) ?? null,
    [tasks, taskModal.editingId],
  );

  // Estado inicializado no mount: o formulário remonta (via `key`)
  // a cada abertura, então não há sincronização via efeito.
  const [projectId, setProjectId] = useState(() => editing?.projectId ?? taskModal.presetProjectId ?? projects[0]?.id ?? '');
  const [title, setTitle] = useState(() => editing?.title ?? '');
  const [description, setDescription] = useState(() => editing?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(() => editing?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(() => editing?.status ?? taskModal.presetStatus ?? 'backlog');
  const [dueDate, setDueDate] = useState(() => editing?.dueDate ?? taskModal.presetDueDate ?? '');
  const [recKind, setRecKind] = useState<'none' | RecurrenceKind>(() => editing?.recurrence?.kind ?? 'none');
  const [recInterval, setRecInterval] = useState(() => editing?.recurrence?.intervalDays ?? 2);
  const [tagIds, setTagIds] = useState<string[]>(() => editing?.tagIds ?? []);
  const [subs, setSubs] = useState<Subtask[]>(() => editing?.subtasks ?? []);  const [tagInput, setTagInput] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [tagActive, setTagActive] = useState(0);
  const [error, setError] = useState('');

  const allTags = useBoardStore((s) => s.tags);
  const ensureTags = useBoardStore((s) => s.ensureTags);
  const tagById = useMemo(() => new Map(allTags.map((t) => [t.id, t] as const)), [allTags]);
  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return allTags
      .filter((t) => !tagIds.includes(t.id) && (q === '' || t.name.includes(q)))
      .slice(0, 6);
  }, [allTags, tagInput, tagIds]);

  const commitTagInput = (value: string): void => {
    const ids = ensureTags(parseTags(value));
    if (ids.length > 0) setTagIds((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))].slice(0, 12));
    setTagInput('');
    setTagOpen(false);
    setTagActive(0);
  };

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Dê um título para a tarefa.');
      return;
    }
    if (!projectId) {
      setError('Escolha um projeto. Crie um projeto primeiro.');
      return;
    }
    // Texto restante vira etiqueta (suporta colar "a, b, c").
    const extraIds = tagInput.trim() ? ensureTags(parseTags(tagInput)) : [];
    const finalIds = [...tagIds, ...extraIds.filter((id) => !tagIds.includes(id))].slice(0, 12);
    const recurrence =
      recKind === 'none'
        ? null
        : { kind: recKind, intervalDays: recKind === 'custom' ? Math.min(365, Math.max(1, recInterval || 1)) : 1 };
    try {
      if (editing) {
        updateTask(editing.id, {
          title,
          description,
          priority,
          status,
          dueDate: dueDate || null,
          tagIds: finalIds,
          projectId,
          recurrence,
          subtasks: subs,
        });
      } else {
        createTask({
          projectId,
          title,
          description,
          priority,
          status,
          dueDate: dueDate || null,
          tagIds: finalIds,
          recurrence,
          subtasks: subs,
        });
      }
      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  };

  return (
    <>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
          <p className="font-semibold">Nenhum projeto ainda</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Crie um projeto antes de adicionar tarefas.
          </p>
          <button type="button" className="btn-primary mt-3" onClick={openNewProject}>
            Criar projeto
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="label" htmlFor="task-project">
                Projeto
              </label>
              <select
                id="task-project"
                className="input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="label" htmlFor="task-title">
                Título *
              </label>
              <input
                id="task-title"
                className="input"
                value={title}
                maxLength={140}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Revisar proposta comercial"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="task-desc">
              Descrição
            </label>
            <textarea
              id="task-desc"
              className="input min-h-24 resize-y"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, critérios de aceite, links…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="task-priority">
                Prioridade
              </label>
              <select
                id="task-priority"
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="task-due">
                Prazo (opcional)
              </label>
              <input
                id="task-due"
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <fieldset>
            <legend className="label">Repetição</legend>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="task-rec-kind" className="sr-only">
                Tipo de repetição
              </label>
              <select
                id="task-rec-kind"
                className="input !w-auto"
                value={recKind}
                onChange={(e) => setRecKind(e.target.value as 'none' | RecurrenceKind)}
              >
                <option value="none">Sem repetição</option>
                {(Object.keys(RECURRENCE_META) as RecurrenceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {RECURRENCE_META[k].label}
                  </option>
                ))}
              </select>
              {recKind === 'custom' ? (
                <>
                  <label htmlFor="task-rec-interval" className="text-sm text-zinc-600 dark:text-zinc-400">
                    a cada
                  </label>
                  <input
                    id="task-rec-interval"
                    type="number"
                    min={1}
                    max={365}
                    className="input !w-20"
                    value={recInterval}
                    onChange={(e) => setRecInterval(Number(e.target.value))}
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">dias</span>
                </>
              ) : null}
            </div>
            {recKind !== 'none' ? (
              <p className="mt-1 text-xs text-zinc-500">
                Ao concluir, uma nova ocorrência é criada ({RECURRENCE_META[recKind].short}).
              </p>
            ) : null}
          </fieldset>

          <div>
            <label className="label" htmlFor="task-tags">
              Etiquetas
            </label>
            {tagIds.length > 0 ? (
              <ul aria-label="Etiquetas selecionadas" className="mb-2 flex flex-wrap gap-1.5">
                {tagIds.map((id) => {
                  const tag = tagById.get(id);
                  if (!tag) return null;
                  return (
                    <li
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pl-2 pr-1 text-xs font-semibold dark:bg-zinc-800"
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      <button
                        type="button"
                        aria-label={`Remover etiqueta ${tag.name}`}
                        className="icon-btn !h-5 !w-5"
                        onClick={() => setTagIds((prev) => prev.filter((x) => x !== id))}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <input
              id="task-tags"
              className="input"
              role="combobox"
              aria-expanded={tagOpen && suggestions.length > 0}
              aria-controls="tag-suggestions"
              aria-activedescendant={
                tagOpen && suggestions[tagActive] ? `tag-option-${suggestions[tagActive]!.id}` : undefined
              }
              autoComplete="off"
              value={tagInput}
              onChange={(e) => {
                const v = e.target.value;
                if (v.includes(',')) {
                  commitTagInput(v);
                } else {
                  setTagInput(v);
                  setTagOpen(true);
                  setTagActive(0);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && suggestions.length > 0) {
                  e.preventDefault();
                  setTagOpen(true);
                  setTagActive((a) => (a + 1) % suggestions.length);
                } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
                  e.preventDefault();
                  setTagActive((a) => (a - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  const picked = tagOpen ? suggestions[tagActive] : undefined;
                  if (picked) {
                    setTagIds((prev) => (prev.includes(picked.id) ? prev : [...prev, picked.id].slice(0, 12)));
                    setTagInput('');
                    setTagOpen(false);
                    setTagActive(0);
                  } else {
                    commitTagInput(tagInput);
                  }
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setTagOpen(false);
                } else if (e.key === 'Backspace' && tagInput === '' && tagIds.length > 0) {
                  setTagIds((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={() => setTagOpen(false)}
              placeholder="Digite e Enter para criar, ou escolha abaixo"
            />
            {tagOpen && suggestions.length > 0 ? (
              <ul id="tag-suggestions" role="listbox" aria-label="Sugestões de etiquetas" className="card mt-1 max-h-36 overflow-y-auto p-1">
                {suggestions.map((s, i) => (
                  <li key={s.id} role="option" id={`tag-option-${s.id}`} aria-selected={i === tagActive}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setTagIds((prev) => (prev.includes(s.id) ? prev : [...prev, s.id].slice(0, 12)));
                        setTagInput('');
                        setTagOpen(false);
                        setTagActive(0);
                      }}
                      onMouseEnter={() => setTagActive(i)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        i === tagActive ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]' : ''
                      }`}
                    >
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <SubtaskEditor value={subs} onChange={setSubs} />

          {error ? (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            {editing ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Última edição em {toDateTime(editing.updatedAt)}
              </p>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={closeTaskModal}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {editing ? 'Salvar alterações' : 'Criar tarefa'}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
