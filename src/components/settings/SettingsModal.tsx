import { useState } from 'react';
import { Download, Pencil, Plus, Settings2, Trash2, Upload } from 'lucide-react';
import { PROJECT_COLORS } from '../../utils/constants';
import { toDateTime } from '../../utils/date';
import { cn } from '../../utils/core';
import { useBoardStore } from '../../stores/useBoardStore';
import { usePrefsStore } from '../../stores/usePrefsStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUIStore } from '../../stores/useUIStore';
import type { ThemePreference } from '../../types';
import { Modal } from '../ui/Modal';

const THEMES: Array<{ id: ThemePreference; label: string }> = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'system', label: 'Sistema' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section aria-label={title} className="border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

function TagsManager(): React.JSX.Element {
  const tags = useBoardStore((s) => s.tags);
  const tasks = useBoardStore((s) => s.tasks);
  const createTag = useBoardStore((s) => s.createTag);
  const updateTag = useBoardStore((s) => s.updateTag);
  const deleteTag = useBoardStore((s) => s.deleteTag);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const usage = (id: string): number => tasks.filter((t) => t.tagIds.includes(id)).length;

  const submitNew = (e: React.FormEvent): void => {
    e.preventDefault();
    try {
      createTag(name);
      setName('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar.');
    }
  };

  return (
    <div>
      <form onSubmit={submitNew} className="flex gap-2">
        <label htmlFor="new-tag-name" className="sr-only">
          Nome da nova etiqueta
        </label>
        <input
          id="new-tag-name"
          className="input"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova etiqueta…"
        />
        <button type="submit" className="btn-primary shrink-0" aria-label="Criar etiqueta">
          <Plus size={16} aria-hidden />
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {tags.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          Nenhuma etiqueta. Crie acima ou digitando no campo de etiquetas da tarefa.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800"
            >
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
              {editingId === tag.id ? (
                <form
                  className="flex min-w-0 flex-1 gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      updateTag(tag.id, { name: editName });
                      setEditingId(null);
                      setError('');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
                    }
                  }}
                >
                  <label htmlFor={`edit-tag-${tag.id}`} className="sr-only">
                    Renomear etiqueta {tag.name}
                  </label>
                  <input
                    id={`edit-tag-${tag.id}`}
                    className="input !py-1 text-sm"
                    value={editName}
                    maxLength={40}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary shrink-0 !px-3 !py-1 text-xs">
                    Salvar
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{tag.name}</span>
                  <span className="text-[11px] tabular-nums text-zinc-500">
                    {usage(tag.id)} {usage(tag.id) === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                  <div className="flex shrink-0" role="group" aria-label={`Cor da etiqueta ${tag.name}`}>
                    {PROJECT_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Cor ${c} para ${tag.name}`}
                        aria-pressed={tag.color === c}
                        onClick={() => updateTag(tag.id, { color: c })}
                        className={cn(
                          'h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900',
                          tag.color === c && 'ring-2 ring-indigo-500',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7"
                    aria-label={`Renomear etiqueta ${tag.name}`}
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditName(tag.name);
                      setError('');
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7 hover:!text-red-600"
                    aria-label={`Excluir etiqueta ${tag.name}`}
                    onClick={() =>
                      askConfirm({
                        title: 'Excluir etiqueta',
                        description: `“${tag.name}” será removida de ${usage(tag.id)} tarefas.`,
                        confirmLabel: 'Excluir',
                        action: () => deleteTag(tag.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BackupSection(): React.JSX.Element {
  const backups = useBoardStore((s) => s.backups);
  const createManualBackup = useBoardStore((s) => s.createManualBackup);
  const restoreBackup = useBoardStore((s) => s.restoreBackup);
  const askConfirm = useUIStore((s) => s.askConfirm);

  return (
    <div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Cópias automáticas a cada 10 alterações e uma vez ao dia (últimas 5 guardadas).
      </p>
      <button type="button" className="btn-ghost mt-2 text-xs" onClick={createManualBackup}>
        <Download size={14} aria-hidden /> Fazer backup agora
      </button>
      {backups.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">Nenhum backup ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {backups.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-800"
            >
              <span className="min-w-0 flex-1">
                <strong>{b.reason === 'manual' ? 'Manual' : 'Automático'}</strong>
                {' · '}
                <span className="tabular-nums">{toDateTime(b.createdAt)}</span>
                {' · '}
                {b.projects} proj. / {b.tasks} tarefas
              </span>
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 font-bold text-indigo-600 hover:bg-indigo-600/10 dark:text-indigo-400"
                onClick={() =>
                  askConfirm({
                    title: 'Restaurar backup',
                    description: `Os dados atuais serão substituídos pelo backup de ${toDateTime(b.createdAt)}.`,
                    confirmLabel: 'Restaurar',
                    action: () => restoreBackup(b.id),
                  })
                }
              >
                <Upload size={13} aria-hidden className="mr-1 inline" />
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Configurações: aparência, atalhos, etiquetas e backups. */
export function SettingsModal(): React.JSX.Element {
  const open = useUIStore((s) => s.settingsOpen);
  const setOpen = useUIStore((s) => s.setSettingsOpen);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const shortcutsEnabled = usePrefsStore((s) => s.shortcutsEnabled);
  const setShortcutsEnabled = usePrefsStore((s) => s.setShortcutsEnabled);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);

  return (
    <Modal open={open} title="Configurações" description="Preferências salvas neste dispositivo." onClose={() => setOpen(false)} wide>
      <div className="space-y-5">
        <Section title="Aparência">
          <div role="radiogroup" aria-label="Tema" className="flex gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={preference === t.id}
                onClick={() => setPreference(t.id)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                  preference === t.id
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Atalhos de teclado">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              Atalhos de letra (N, P, /, ?)
              <span className="block text-xs font-normal text-zinc-500">
                Ctrl+K e Esc funcionam sempre.
              </span>
            </span>
            <input
              type="checkbox"
              checked={shortcutsEnabled}
              onChange={(e) => setShortcutsEnabled(e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
          </label>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            onClick={() => {
              setOpen(false);
              setShortcutsOpen(true);
            }}
          >
            Ver todos os atalhos
          </button>
        </Section>

        <Section title="Etiquetas">
          <TagsManager />
        </Section>

        <Section title="Backup e restauração">
          <BackupSection />
        </Section>

        <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Settings2 size={12} aria-hidden />
          Dados e backups ficam neste navegador (IndexedDB). Exporte JSON para cópia externa.
        </p>
      </div>
    </Modal>
  );
}
