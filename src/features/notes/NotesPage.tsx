import { Archive, NotebookPen, Pin, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toDateOnly } from '../../utils/date';
import { cn } from '../../utils/core';
import { filterNotes, noteExcerpt } from '../../services/markdownEdit';
import { useNoteStore } from '../../stores/useNoteStore';
import { TagChip } from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoteWorkspace } from './NoteWorkspace';

/**
 * Notas em layout de editor: lista à esquerda + workspace à direita
 * (desktop); no mobile, lista cheia e editor em tela cheia.
 */
export function NotesPage(): React.JSX.Element {
  const notes = useNoteStore((s) => s.notes);
  const createNote = useNoteStore((s) => s.createNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void useNoteStore.getState().hydrate();
  }, []);

  const folders = useMemo(
    () => [...new Set(notes.map((n) => n.folder).filter((f) => f !== ''))].sort((a, b) => a.localeCompare(b)),
    [notes],
  );
  const filtered = useMemo(
    () => filterNotes(notes, { q: search, folder: folderFilter, showArchived }),
    [notes, search, folderFilter, showArchived],
  );
  const archivedCount = useMemo(() => notes.filter((n) => n.archived).length, [notes]);
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const newNote = (): void => {
    // Reaproveita rascunho vazio em vez de empilhar notas em branco.
    const empty = notes.find((n) => !n.archived && n.title === '' && n.content === '');
    if (empty) {
      setSelectedId(empty.id);
      return;
    }
    setSelectedId(createNote(folderFilter === '' ? {} : { folder: folderFilter }).id);
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Editor Markdown com preview ao vivo — tudo neste dispositivo.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={newNote}>
          <Plus size={15} aria-hidden /> Nova nota
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-44 flex-1">
          <label htmlFor="notes-search" className="sr-only">Pesquisar notas</label>
          <input
            id="notes-search"
            type="search"
            className="input !py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título, texto, pasta ou etiqueta…"
          />
        </div>
        <label htmlFor="notes-folder" className="sr-only">Filtrar por pasta</label>
        <select
          id="notes-folder"
          className="input !w-auto !py-2 text-sm"
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
        >
          <option value="">Todas as pastas</option>
          {folders.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={showArchived}
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-[0.98]',
            showArchived
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300',
          )}
        >
          <Archive size={14} aria-hidden />
          Arquivadas{archivedCount > 0 ? ` (${archivedCount})` : ''}
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nenhuma nota ainda"
          description="Capture ideias em Markdown com preview ao vivo, pastas, etiquetas e salvamento automático."
          action={
            <button type="button" className="btn-primary" onClick={newNote}>
              <Plus size={16} aria-hidden /> Criar nota
            </button>
          }
        />
      ) : (
        <div className="items-start gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          <ul
            aria-label="Lista de notas"
            className={cn('space-y-2 lg:max-h-[70dvh] lg:overflow-y-auto lg:pr-1', selectedId ? 'hidden lg:block' : 'block')}
          >
            {filtered.length === 0 ? (
              <li className="card p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Nenhuma nota com estes filtros.
              </li>
            ) : null}
            {filtered.map((n) => {
              const active = n.id === selectedId;
              return (
                <li key={n.id} data-testid={`note-card-${n.id}`}>
                  <div
                    className={cn(
                      'card card-hover flex items-start gap-1.5 p-3',
                      active && 'border-[var(--accent)] dark:border-[var(--accent)]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      aria-label={`Abrir nota ${n.title || 'sem título'} no editor`}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        {n.color ? (
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
                        ) : null}
                        {n.pinned ? <Pin size={12} aria-hidden className="shrink-0 text-[var(--accent)]" fill="currentColor" /> : null}
                        <span className="truncate text-sm font-bold">{n.title || 'Sem título'}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-600 dark:text-zinc-400">
                        {noteExcerpt(n.content) || 'Vazia'}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {n.folder !== '' ? (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {n.folder}
                          </span>
                        ) : null}
                        {n.tags.slice(0, 3).map((t) => (
                          <TagChip key={t} label={t} />
                        ))}
                      </span>
                      <span className="mt-1 block text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500">
                        {toDateOnly(n.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn !h-7 !w-7 shrink-0"
                      title={n.pinned ? 'Desafixar' : 'Fixar no topo'}
                      aria-label={`${n.pinned ? 'Desafixar' : 'Fixar'} nota ${n.title || 'sem título'}`}
                      aria-pressed={n.pinned}
                      onClick={() => togglePin(n.id)}
                    >
                      <Pin size={14} aria-hidden fill={n.pinned ? 'currentColor' : 'none'} className={n.pinned ? 'text-[var(--accent)]' : undefined} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={cn('min-h-0 flex-col lg:flex', selected ? 'flex' : 'hidden')}>
            {selected ? (
              <NoteWorkspace
                key={selected.id}
                noteId={selected.id}
                folders={folders}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div className="card hidden flex-1 items-center justify-center p-12 text-center lg:flex">
                <div>
                  <NotebookPen size={28} aria-hidden className="mx-auto text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold">Selecione uma nota</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    ou crie uma nova para começar a escrever.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
