import { useMemo, useState } from 'react';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { PRIORITY_META, STATUS_META } from '../../utils/constants';
import { parseTags } from '../../utils/core';
import { Modal } from '../ui/Modal';

export function TaskModal(): React.JSX.Element {
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

  // Estado inicializado no mount: o App remonta este componente (via `key`)
  // a cada abertura, então não há sincronização via efeito.
  const [projectId, setProjectId] = useState(() => editing?.projectId ?? taskModal.presetProjectId ?? projects[0]?.id ?? '');
  const [title, setTitle] = useState(() => editing?.title ?? '');
  const [description, setDescription] = useState(() => editing?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(() => editing?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(() => editing?.status ?? taskModal.presetStatus ?? 'backlog');
  const [dueDate, setDueDate] = useState(() => editing?.dueDate ?? taskModal.presetDueDate ?? '');
  const [tags, setTags] = useState(() => editing?.tags.join(', ') ?? '');
  const [error, setError] = useState('');

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
    try {
      if (editing) {
        updateTask(editing.id, {
          title,
          description,
          priority,
          status,
          dueDate: dueDate || null,
          tags: parseTags(tags),
          projectId,
        });
      } else {
        createTask({
          projectId,
          title,
          description,
          priority,
          status,
          dueDate: dueDate || null,
          tags: parseTags(tags),
        });
      }
      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  };

  return (
    <Modal
      open={taskModal.open}
      title={editing ? 'Editar tarefa' : 'Nova tarefa'}
      description={editing ? 'Ajuste os detalhes da tarefa.' : 'Descreva o trabalho a ser feito. (atalho: N)'}
      onClose={closeTaskModal}
      wide
    >
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

          <div>
            <label className="label" htmlFor="task-tags">
              Tags <span className="font-normal normal-case">(separadas por vírgula)</span>
            </label>
            <input
              id="task-tags"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex.: design, urgente, cliente-x"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={closeTaskModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Salvar alterações' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
