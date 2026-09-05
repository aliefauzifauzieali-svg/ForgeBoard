import { useEffect, useState } from 'react';
import { PROJECT_COLORS } from '../../utils/constants';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';
import { Modal } from '../ui/Modal';

export function ProjectModal(): React.JSX.Element {
  const projectModal = useUIStore((s) => s.projectModal);
  const closeProjectModal = useUIStore((s) => s.closeProjectModal);
  const projects = useBoardStore((s) => s.projects);
  const createProject = useBoardStore((s) => s.createProject);
  const updateProject = useBoardStore((s) => s.updateProject);

  const editing = projects.find((p) => p.id === projectModal.editingId) ?? null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]!);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectModal.open) return;
    setError('');
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setColor(editing.color);
    } else {
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]!);
    }
  }, [projectModal.open, editing]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dê um nome para o projeto.');
      return;
    }
    try {
      if (editing) updateProject(editing.id, { name, description, color });
      else createProject({ name, description, color });
      closeProjectModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  };

  return (
    <Modal
      open={projectModal.open}
      title={editing ? 'Editar projeto' : 'Novo projeto'}
      description="Organize um conjunto de tarefas em um quadro Kanban. (atalho: P)"
      onClose={closeProjectModal}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="project-name">
            Nome *
          </label>
          <input
            id="project-name"
            className="input"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Lançamento do site"
          />
        </div>
        <div>
          <label className="label" htmlFor="project-desc">
            Descrição
          </label>
          <textarea
            id="project-desc"
            className="input min-h-20 resize-y"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objetivo, escopo, links…"
          />
        </div>
        <fieldset>
          <legend className="label">Cor</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do projeto">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  'h-9 w-9 rounded-full transition',
                  color === c
                    ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900'
                    : 'hover:scale-110',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={closeProjectModal}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {editing ? 'Salvar alterações' : 'Criar projeto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
