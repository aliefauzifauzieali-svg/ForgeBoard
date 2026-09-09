import {
  Archive,
  ArrowLeft,
  Bold,
  Check,
  Code2,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Pin,
  Quote,
  RotateCcw,
  Strikethrough,
  Table,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROJECT_COLORS } from '../../utils/constants';
import { toDateTime } from '../../utils/date';
import { cn } from '../../utils/core';
import { renderMarkdown } from '../../services/markdown';
import {
  countWords,
  insertCodeBlockEdit,
  insertImageEdit,
  insertLinkEdit,
  insertTableEdit,
  readingMinutes,
  surroundEdit,
  togglePrefixEdit,
  type EditResult,
} from '../../services/markdownEdit';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';

interface Draft {
  title: string;
  content: string;
  color: string | undefined;
  tagsText: string;
  folder: string;
}

/** Aplica um EditResult puro ao textarea (caret restaurado no próximo frame). */
function useApply(areaRef: React.RefObject<HTMLTextAreaElement | null>, setContent: (v: string) => void) {
  return (fn: (el: HTMLTextAreaElement) => EditResult): void => {
    const el = areaRef.current;
    if (!el) return;
    const r = fn(el);
    setContent(r.value);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.selStart, r.selEnd);
    });
  };
}

function ToolButton({
  label,
  title,
  onClick,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="icon-btn !h-8 !w-8 shrink-0"
      title={title}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Editor da nota ativa: título, metadados, toolbar completa, edição +
 * preview ao vivo e barra de status. Autosave 500ms + botão Salvar.
 */
export function NoteWorkspace({
  noteId,
  folders,
  onBack,
}: {
  noteId: string;
  folders: string[];
  onBack: () => void;
}): React.JSX.Element {
  const note = useNoteStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const duplicateNote = useNoteStore((s) => s.duplicateNote);
  const askConfirm = useUIStore((s) => s.askConfirm);

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor] = useState<string | undefined>(note?.color);
  const [tagsText, setTagsText] = useState(() => (note?.tags ?? []).join(', '));
  const [folder, setFolder] = useState(note?.folder ?? '');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [savedKey, setSavedKey] = useState(() =>
    JSON.stringify({ title: note?.title ?? '', content: note?.content ?? '', color: note?.color, tagsText: (note?.tags ?? []).join(', '), folder: note?.folder ?? '' }),
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);
  const draftRef = useRef<Draft>({ title, content, color, tagsText, folder });
  const lastSavedRef = useRef<string>(savedKey);

  const persist = useCallback(
    (d: Draft): void => {
      const key = JSON.stringify(d);
      if (key === lastSavedRef.current) return;
      lastSavedRef.current = key;
      updateNote(noteId, {
        title: d.title,
        content: d.content,
        color: d.color,
        tags: d.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
        folder: d.folder.trim(),
      });
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      setSavedKey(key);
      setSavedAt(`${hh}:${mi}`);
    },
    [noteId, updateNote],
  );
  const persistRef = useRef(persist);

  // Autosave com debounce; descarrega o pendente ao trocar/desmontar.
  // Refs sincronizadas aqui (efeito), nunca em render.
  useEffect(() => {
    if (noteId === '') return undefined;
    draftRef.current = { title, content, color, tagsText, folder };
    persistRef.current = persist;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      persistRef.current(draftRef.current);
    }, 500);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [noteId, persist, title, content, color, tagsText, folder]);
  useEffect(
    () => () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      persistRef.current(draftRef.current);
    },
    [],
  );

  const apply = useApply(areaRef, setContent);
  const words = useMemo(() => countWords(`${title}\n${content}`), [title, content]);
  const minutes = useMemo(() => readingMinutes(words), [words]);
  const html = useMemo(() => renderMarkdown(content || '*Nada para visualizar.*'), [content]);
  const dirty = JSON.stringify({ title, content, color, tagsText, folder }) !== savedKey;
  const saveLabel = dirty ? 'Editando…' : savedAt ? `Salvo às ${savedAt}` : 'Salvo';

  if (!note) return <></>;

  const saveNow = (): void => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persist(draftRef.current);
  };

  return (
    <div className="card flex min-h-0 flex-1 flex-col p-4 sm:p-5" aria-label={`Editor da nota ${note.title || 'sem título'}`}>
      <div className="flex items-center gap-2">
        <button type="button" className="icon-btn shrink-0 lg:hidden" aria-label="Voltar para a lista" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden />
        </button>
        <label htmlFor="note-title" className="sr-only">Título da nota</label>
        <input
          id="note-title"
          className="min-w-0 flex-1 bg-transparent text-lg font-extrabold tracking-tight outline-none placeholder:text-zinc-400"
          value={title}
          maxLength={120}
          placeholder="Sem título"
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn shrink-0"
          title={note.pinned ? 'Desafixar' : 'Fixar no topo'}
          aria-label={note.pinned ? 'Desafixar nota' : 'Fixar nota no topo'}
          aria-pressed={note.pinned}
          onClick={() => togglePin(note.id)}
        >
          <Pin size={16} aria-hidden fill={note.pinned ? 'currentColor' : 'none'} className={note.pinned ? 'text-[var(--accent)]' : undefined} />
        </button>
        <button
          type="button"
          className="icon-btn shrink-0"
          title="Duplicar nota"
          aria-label="Duplicar nota"
          onClick={() => duplicateNote(note.id)}
        >
          <Copy size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="icon-btn shrink-0"
          title={note.archived ? 'Desarquivar' : 'Arquivar'}
          aria-label={note.archived ? 'Desarquivar nota' : 'Arquivar nota'}
          onClick={() => archiveNote(note.id, !note.archived)}
        >
          {note.archived ? <RotateCcw size={16} aria-hidden /> : <Archive size={16} aria-hidden />}
        </button>
        <button
          type="button"
          className="icon-btn shrink-0 hover:!text-red-500"
          title="Excluir nota"
          aria-label="Excluir nota"
          onClick={() =>
            askConfirm({
              title: 'Excluir nota',
              description: `“${note.title || 'Sem título'}” será excluída permanentemente.`,
              confirmLabel: 'Excluir',
              action: () => {
                deleteNote(note.id);
                onBack();
              },
            })
          }
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor="note-folder" className="sr-only">Pasta</label>
        <input
          id="note-folder"
          className="input !w-32 !py-1.5 text-xs"
          value={folder}
          maxLength={40}
          list="note-folders"
          placeholder="Pasta…"
          onChange={(e) => setFolder(e.target.value)}
        />
        <datalist id="note-folders">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <label htmlFor="note-tags" className="sr-only">Etiquetas separadas por vírgula</label>
        <input
          id="note-tags"
          className="input min-w-0 flex-1 !py-1.5 text-xs"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="etiquetas, separadas, por, vírgula"
        />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Cor da nota">
          <button
            type="button"
            role="radio"
            aria-checked={color === undefined}
            aria-label="Sem cor"
            title="Sem cor"
            onClick={() => setColor(undefined)}
            className={cn(
              'h-5 w-5 rounded-full border border-dashed border-zinc-400',
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
                'h-5 w-5 rounded-full',
                color === c && 'ring-2 ring-[var(--accent)] ring-offset-2 dark:ring-offset-zinc-900',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-0.5 overflow-x-auto pb-1" role="toolbar" aria-label="Formatação Markdown">
        <ToolButton label="Negrito" title="Negrito (Ctrl+B)" onClick={() => apply((el) => surroundEdit(el.value, el.selectionStart, el.selectionEnd, '**', '**'))}><Bold size={15} aria-hidden /></ToolButton>
        <ToolButton label="Itálico" title="Itálico (Ctrl+I)" onClick={() => apply((el) => surroundEdit(el.value, el.selectionStart, el.selectionEnd, '_', '_'))}><Italic size={15} aria-hidden /></ToolButton>
        <ToolButton label="Tachado" title="Tachado" onClick={() => apply((el) => surroundEdit(el.value, el.selectionStart, el.selectionEnd, '~~', '~~'))}><Strikethrough size={15} aria-hidden /></ToolButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />
        <ToolButton label="Título 1" title="Título 1" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '# '))}><Heading1 size={15} aria-hidden /></ToolButton>
        <ToolButton label="Título 2" title="Título 2" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '## '))}><Heading2 size={15} aria-hidden /></ToolButton>
        <ToolButton label="Título 3" title="Título 3" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '### '))}><Heading3 size={15} aria-hidden /></ToolButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />
        <ToolButton label="Lista com marcadores" title="Lista com marcadores" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '- '))}><List size={15} aria-hidden /></ToolButton>
        <ToolButton label="Lista numerada" title="Lista numerada" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '1. '))}><ListOrdered size={15} aria-hidden /></ToolButton>
        <ToolButton label="Checklist" title="Item de checklist" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '- [ ] '))}><ListChecks size={15} aria-hidden /></ToolButton>
        <ToolButton label="Citação" title="Citação" onClick={() => apply((el) => togglePrefixEdit(el.value, el.selectionStart, '> '))}><Quote size={15} aria-hidden /></ToolButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />
        <ToolButton label="Código inline" title="Código inline" onClick={() => apply((el) => surroundEdit(el.value, el.selectionStart, el.selectionEnd, '`', '`', 'código'))}><Code2 size={15} aria-hidden /></ToolButton>
        <ToolButton label="Bloco de código" title="Bloco de código" onClick={() => apply((el) => insertCodeBlockEdit(el.value, el.selectionStart, el.selectionEnd))}><Terminal size={15} aria-hidden /></ToolButton>
        <ToolButton label="Link" title="Link (Ctrl+K)" onClick={() => apply((el) => insertLinkEdit(el.value, el.selectionStart, el.selectionEnd))}><Link2 size={15} aria-hidden /></ToolButton>
        <ToolButton label="Imagem" title="Imagem (link)" onClick={() => apply((el) => insertImageEdit(el.value, el.selectionStart))}><Image size={15} aria-hidden /></ToolButton>
        <ToolButton label="Tabela" title="Inserir tabela" onClick={() => apply((el) => insertTableEdit(el.value, el.selectionStart))}><Table size={15} aria-hidden /></ToolButton>
      </div>

      <div className="mt-1 flex gap-1.5 lg:hidden" role="group" aria-label="Modo do editor">
        {(['edit', 'preview'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mobileTab === m}
            onClick={() => setMobileTab(m)}
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              mobileTab === m
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
            )}
          >
            {m === 'edit' ? 'Editar' : 'Visualizar'}
          </button>
        ))}
      </div>

      <div className="mt-2 grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className={cn('min-h-0 flex-col', mobileTab === 'edit' ? 'flex' : 'hidden', 'lg:flex')}>
          <label htmlFor="note-content" className="sr-only">Conteúdo em Markdown</label>
          <textarea
            ref={areaRef}
            id="note-content"
            className="input min-h-[40dvh] flex-1 resize-y font-mono text-[13px] leading-relaxed lg:min-h-[46dvh]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              const mod = e.ctrlKey || e.metaKey;
              const el = e.currentTarget;
              if (mod && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                apply((t) => surroundEdit(t.value, t.selectionStart, t.selectionEnd, '**', '**'));
              } else if (mod && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                apply((t) => surroundEdit(t.value, t.selectionStart, t.selectionEnd, '_', '_'));
              } else if (mod && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                apply((t) => insertLinkEdit(t.value, t.selectionStart, t.selectionEnd));
              } else if (mod && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                saveNow();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                const { selectionStart: s, selectionEnd: en, value } = el;
                const next = `${value.slice(0, s)}  ${value.slice(en)}`;
                setContent(next);
                window.requestAnimationFrame(() => {
                  el.focus();
                  el.setSelectionRange(s + 2, s + 2);
                });
              }
            }}
            placeholder={'# Título\n\nTexto com **negrito**, *itálico* e `código`.\n\n- item\n- [ ] tarefa\n\n> citação\n\n| A | B |\n| --- | --- |\n| 1 | 2 |'}
          />
        </div>
        <div className={cn('min-h-0 flex-col', mobileTab === 'preview' ? 'flex' : 'hidden', 'lg:flex')}>
          <div
            role="region"
            aria-label="Pré-visualização"
            className="markdown-body min-h-[40dvh] flex-1 overflow-y-auto rounded-xl border border-zinc-200 px-4 py-3 lg:min-h-[46dvh] dark:border-zinc-800"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-200 pt-2.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="tabular-nums">{words} {words === 1 ? 'palavra' : 'palavras'}</span>
        <span aria-hidden>·</span>
        <span>{minutes === 0 ? '—' : `~${minutes} min de leitura`}</span>
        <span aria-hidden>·</span>
        <span role="status" className="inline-flex items-center gap-1">
          {dirty ? null : <Check size={12} aria-hidden className="text-emerald-500" />}
          {saveLabel}
        </span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">Atualizada em {toDateTime(note.updatedAt)}</span>
        <button type="button" className="btn-secondary ml-auto !py-1 text-xs" onClick={saveNow}>
          Salvar
        </button>
      </div>
    </div>
  );
}
