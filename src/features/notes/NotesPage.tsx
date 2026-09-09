import { Bold, Code2, Eye, Heading2, Italic, List, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { PROJECT_COLORS } from '../../utils/constants';
import { toDateOnly } from '../../utils/date';
import { cn } from '../../utils/core';
import { renderMarkdown } from '../../services/markdown';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';
import { TagChip } from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

/** Insere `before`/`after` ao redor da seleção (ou no cursor). */
function surround(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  setContent: (v: string) => void,
): void {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const selected = value.slice(s, e) || 'texto';
  const next = `${value.slice(0, s)}${before}${selected}${after}${value.slice(e)}`;
  setContent(next);
  window.requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(s + before.length, s + before.length + selected.length);
  });
}

function insertPrefix(el: HTMLTextAreaElement, prefix: string, setContent: (v: string) => void): void {
  const { selectionStart: s, value } = el;
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  setContent(next);
  window.requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(s + prefix.length, s + prefix.length);
  });
}

function NoteEditor({
  noteId,
  flushRef,
  onClose,
}: {
  noteId: string;
  flushRef: RefObject<(() => void) | null>;
  onClose: () => void;
}): React.JSX.Element {
  const note = useNoteStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor] = useState<string | undefined>(note?.color);
  const [tagsText, setTagsText] = useState(() => (note?.tags ?? []).join(', '));
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);
  const draftRef = useRef({ title, content, color, tagsText });

  // Salva o rascunho (ou apaga a nota vazia). Chamado pelo fechar do Modal
  // e pelo botão Concluir — nunca chama onClose (evita recursão).
  const flush = (): void => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const d = draftRef.current;
    if (d.title.trim() === '' && d.content.trim() === '') {
      deleteNote(noteId);
    } else {
      updateNote(noteId, {
        title: d.title,
        content: d.content,
        color: d.color,
        tags: d.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      });
    }
  };

  // Expõe o flush para o fechar do Modal (X/overlay/Esc). Refs sincronizadas
  // em efeito (nunca acesso em render).
  const flushRefRef = useRef(flush);
  useEffect(() => {
    draftRef.current = { title, content, color, tagsText };
    flushRefRef.current = flush;
  });
  useEffect(() => {
    flushRef.current = () => flushRefRef.current();
    return () => {
      flushRef.current = null;
    };
  }, [flushRef]);

  // Todos os hooks acima do retorno condicional (regras dos hooks).

  // Autosave com debounce (500ms); limpa ao desmontar.
  useEffect(() => {
    if (noteId === '') return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      const d = draftRef.current;
      updateNote(noteId, {
        title: d.title,
        content: d.content,
        color: d.color,
        tags: d.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      });
    }, 500);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [noteId, title, content, color, tagsText, updateNote]);

  if (!note) return <></>;

  const apply = (fn: (el: HTMLTextAreaElement) => void): void => {
    const el = areaRef.current;
    if (el) fn(el);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="note-title">
          Título
        </label>
        <input
          id="note-title"
          className="input"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da nota"
        />
      </div>
      <div className="flex items-center gap-1.5" role="toolbar" aria-label="Formatação Markdown">
        <button type="button" className="icon-btn !h-7 !w-7" title="Negrito (Ctrl+B)" aria-label="Negrito" onClick={() => apply((el) => surround(el, '**', '**', setContent))}>
          <Bold size={14} />
        </button>
        <button type="button" className="icon-btn !h-7 !w-7" title="Itálico (Ctrl+I)" aria-label="Itálico" onClick={() => apply((el) => surround(el, '_', '_', setContent))}>
          <Italic size={14} />
        </button>
        <button type="button" className="icon-btn !h-7 !w-7" title="Título" aria-label="Título de seção" onClick={() => apply((el) => insertPrefix(el, '## ', setContent))}>
          <Heading2 size={14} />
        </button>
        <button type="button" className="icon-btn !h-7 !w-7" title="Lista" aria-label="Lista com marcadores" onClick={() => apply((el) => insertPrefix(el, '- ', setContent))}>
          <List size={14} />
        </button>
        <button type="button" className="icon-btn !h-7 !w-7" title="Checklist" aria-label="Item de checklist" onClick={() => apply((el) => insertPrefix(el, '- [ ] ', setContent))}>
          <ListChecks size={14} />
        </button>
        <button type="button" className="icon-btn !h-7 !w-7" title="Código" aria-label="Trecho de código" onClick={() => apply((el) => surround(el, '`', '`', setContent))}>
          <Code2 size={14} />
        </button>
        <span className="ml-auto flex gap-1.5" role="group" aria-label="Modo do editor">
          {(['edit', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={tab === m}
              onClick={() => setTab(m)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                tab === m
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              {m === 'edit' ? (
                <span className="inline-flex items-center gap-1">
                  <Pencil size={12} aria-hidden /> Editar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} aria-hidden /> Visualizar
                </span>
              )}
            </button>
          ))}
        </span>
      </div>
      {tab === 'edit' ? (
        <div>
          <label className="label" htmlFor="note-content">
            Conteúdo (Markdown)
          </label>
          <textarea
            ref={areaRef}
            id="note-content"
            className="input min-h-56 resize-y font-mono text-[13px] leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                apply((el) => surround(el, '**', '**', setContent));
              } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                apply((el) => surround(el, '_', '_', setContent));
              }
            }}
            placeholder={'# Ideia\n\n- ponto 1\n- [ ] tarefa\n\n**negrito** e `código`'}
          />
        </div>
      ) : (
        <div
          role="region"
          aria-label="Pré-visualização"
          className="markdown-body min-h-56 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '*Nada para visualizar.*') }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Etiquetas:</span>
        <label htmlFor="note-tags" className="sr-only">
          Etiquetas separadas por vírgula
        </label>
        <input
          id="note-tags"
          className="input min-w-0 flex-1 !py-1.5 text-xs"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="ideias, rascunho"
        />
      </div>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor da nota">
        <button
          type="button"
          role="radio"
          aria-checked={color === undefined}
          aria-label="Sem cor"
          title="Sem cor"
          onClick={() => setColor(undefined)}
          className={cn(
            'h-6 w-6 rounded-full border border-dashed border-zinc-400',
            color === undefined && 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-zinc-900',
          )}
        />
        {PROJECT_COLORS.slice(0, 6).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Cor ${c}`}
            onClick={() => setColor(c)}
            className={cn(
              'h-6 w-6 rounded-full',
              color === c && 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-zinc-900',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-primary" onClick={onClose}>
          Concluir
        </button>
      </div>
    </div>
  );
}

export function NotesPage(): React.JSX.Element {
  const notes = useNoteStore((s) => s.notes);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const askConfirm = useUIStore((s) => s.askConfirm);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorFlush = useRef<(() => void) | null>(null);

  const closeEditor = (): void => {
    editorFlush.current?.();
    editorFlush.current = null;
    setEditingId(null);
  };

  useEffect(() => {
    void useNoteStore.getState().hydrate();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!q) return list;
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ideias e rascunhos em Markdown — salvos neste dispositivo.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setEditingId(createNote({}).id)}
        >
          <Plus size={15} aria-hidden /> Nova nota
        </button>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="notes-search" className="sr-only">
          Pesquisar notas
        </label>
        <input
          id="notes-search"
          type="search"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por título, texto ou etiqueta…"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Pencil}
          title={search ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
          description={
            search ? 'Ajuste a busca.' : 'Capture ideias em Markdown com preview, etiquetas e salvamento automático.'
          }
          action={
            search ? undefined : (
              <button type="button" className="btn-primary" onClick={() => setEditingId(createNote({}).id)}>
                <Plus size={16} aria-hidden /> Criar nota
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 stagger">
          {filtered.map((n) => (
            <li
              key={n.id}
              data-testid={`note-card-${n.id}`}
              className="card card-hover group flex min-w-0 animate-fade-up flex-col p-4"
            >
              <div className="flex items-start gap-2">
                {n.color ? (
                  <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditingId(n.id)}
                  aria-label={`Abrir nota ${n.title || 'sem título'} para edição`}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-bold">{n.title || 'Sem título'}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-600 dark:text-zinc-400">
                    {n.content || 'Vazia'}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn !h-7 !w-7 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
                  aria-label={`Excluir nota ${n.title || 'sem título'}`}
                  onClick={() =>
                    askConfirm({
                      title: 'Excluir nota',
                      description: `“${n.title || 'Sem título'}” será excluída permanentemente.`,
                      confirmLabel: 'Excluir',
                      action: () => deleteNote(n.id),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {n.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.slice(0, 4).map((t) => (
                    <TagChip key={t} label={t} />
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500">
                Atualizada em {toDateOnly(n.updatedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editingId !== null}
        title={editingId ? 'Editar nota' : 'Nova nota'}
        description="Salvamento automático enquanto digita."
        onClose={closeEditor}
        wide
      >
        {editingId ? <NoteEditor key={editingId} noteId={editingId} flushRef={editorFlush} onClose={closeEditor} /> : null}
      </Modal>
    </div>
  );
}
