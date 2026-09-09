import { beforeEach, describe, expect, it } from 'vitest';
import { renderMarkdown } from '../services/markdown';
import {
  countWords,
  filterNotes,
  insertCodeBlockEdit,
  insertLinkEdit,
  insertTableEdit,
  noteExcerpt,
  readingMinutes,
  surroundEdit,
  togglePrefixEdit,
} from '../services/markdownEdit';
import { getKV, KV_NOTE_DOCS } from '../storage/idb';
import { useNoteStore } from '../stores/useNoteStore';
import type { Note } from '../types';

function resetNotes(): void {
  useNoteStore.setState({ notes: [], hydrated: false });
}

describe('useNoteStore', () => {
  beforeEach(() => {
    resetNotes();
  });

  it('cria, atualiza e exclui notas', () => {
    const store = useNoteStore.getState();
    const note = store.createNote({ title: 'Ideia', content: '# Olá' });
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(note.title).toBe('Ideia');

    useNoteStore.getState().updateNote(note.id, { content: '**novo**', tags: ['a', 'b'] });
    const updated = useNoteStore.getState().notes.find((n) => n.id === note.id);
    expect(updated?.content).toBe('**novo**');
    expect(updated?.tags).toEqual(['a', 'b']);

    useNoteStore.getState().deleteNote(note.id);
    expect(useNoteStore.getState().notes).toHaveLength(0);
  });

  it('persiste em kv.notes e hidrata', async () => {
    const { id } = useNoteStore.getState().createNote({ title: 'P', content: 'C' });
    const raw = await getKV<unknown>(KV_NOTE_DOCS);
    expect(Array.isArray(raw)).toBe(true);

    resetNotes();
    await useNoteStore.getState().hydrate();
    expect(useNoteStore.getState().notes.map((n) => n.id)).toContain(id);
  });

  it('ignora registros inválidos na hidratação', async () => {
    const { setKV } = await import('../storage/idb');
    await setKV(KV_NOTE_DOCS, [{ id: '', title: 1 }, null, 'x']);
    await useNoteStore.getState().hydrate();
    expect(useNoteStore.getState().notes).toEqual([]);
  });

  it('fixa, arquiva (desafixa junto) e duplica', () => {
    const store = useNoteStore.getState();
    const note = store.createNote({ title: 'Base', content: 'corpo' });
    useNoteStore.getState().togglePin(note.id);
    expect(useNoteStore.getState().notes[0]?.pinned).toBe(true);
    useNoteStore.getState().archiveNote(note.id, true);
    const archived = useNoteStore.getState().notes[0];
    expect(archived?.archived).toBe(true);
    expect(archived?.pinned).toBe(false);
    useNoteStore.getState().archiveNote(note.id, false);

    const copy = useNoteStore.getState().duplicateNote(note.id);
    expect(copy).not.toBeNull();
    expect(copy?.title).toBe('Base (cópia)');
    expect(copy?.content).toBe('corpo');
    expect(copy?.id).not.toBe(note.id);
    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(useNoteStore.getState().duplicateNote('inexistente')).toBeNull();
  });

  it('pasta e hidratação com padrões p/ notas antigas', async () => {
    const note = useNoteStore.getState().createNote({});
    useNoteStore.getState().updateNote(note.id, { folder: 'trabalho' });
    expect(useNoteStore.getState().notes[0]?.folder).toBe('trabalho');
    await new Promise((r) => setTimeout(r, 0));

    const { setKV } = await import('../storage/idb');
    await setKV(KV_NOTE_DOCS, [{ id: 'old', title: 'Antiga', createdAt: 'x', updatedAt: 'y' }]);
    resetNotes();
    await useNoteStore.getState().hydrate();
    const back = useNoteStore.getState().notes[0];
    expect(back?.folder).toBe('');
    expect(back?.pinned).toBe(false);
    expect(back?.archived).toBe(false);
  });
});

describe('renderMarkdown', () => {
  it('renderiza títulos, listas, negrito, código e checkboxes', () => {
    const html = renderMarkdown('# T\n\n- [ ] item\n\n**n** e `c`');
    expect(html).toContain('<h1');
    expect(html).toContain('<li');
    expect(html).toContain('<strong>n</strong>');
    expect(html).toContain('<code>c</code>');
  });

  it('remove scripts (XSS)', () => {
    const html = renderMarkdown('oi<script>alert(1)</script>');
    expect(html).not.toContain('<script');
    expect(html).toContain('oi');
  });

  it('quebras de linha simples viram <br>', () => {
    expect(renderMarkdown('a\nb')).toContain('<br');
  });

  it('tabelas GFM renderizam', () => {
    const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
  });
});

function note(over: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'T',
    content: 'C',
    tags: [],
    folder: '',
    pinned: false,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

describe('markdownEdit (operações puras)', () => {
  it('surroundEdit envolve seleção e posiciona caret', () => {
    const r = surroundEdit('olá mundo', 4, 9, '**', '**');
    expect(r.value).toBe('olá **mundo**');
    expect([r.selStart, r.selEnd]).toEqual([6, 11]);
  });

  it('surroundEdit usa placeholder sem seleção', () => {
    const r = surroundEdit('', 0, 0, '`', '`', 'código');
    expect(r.value).toBe('`código`');
  });

  it('togglePrefixEdit aplica e remove', () => {
    const on = togglePrefixEdit('linha', 2, '## ');
    expect(on.value).toBe('## linha');
    const off = togglePrefixEdit(on.value, 5, '## ');
    expect(off.value).toBe('linha');
  });

  it('togglePrefixEdit atua na linha do cursor', () => {
    const r = togglePrefixEdit('a\nb', 3, '- ');
    expect(r.value).toBe('a\n- b');
  });

  it('insertTableEdit/insere tabela; insertLinkEdit seleciona url', () => {
    const t = insertTableEdit('', 0);
    expect(t.value).toContain('| Coluna 1 | Coluna 2 |');
    const l = insertLinkEdit('texto', 0, 5);
    expect(l.value).toBe('[texto](url)');
    expect(l.value.slice(l.selStart, l.selEnd)).toBe('url');
  });

  it('insertCodeBlockEdit cerca seleção', () => {
    const r = insertCodeBlockEdit('x', 0, 1);
    expect(r.value).toContain('```\nx\n```');
  });

  it('countWords/readingMinutes', () => {
    expect(countWords('  a  b\nc ')).toBe(3);
    expect(countWords('')).toBe(0);
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(50)).toBe(1);
    expect(readingMinutes(400)).toBe(2);
  });

  it('noteExcerpt limpa marcações e trunca', () => {
    expect(noteExcerpt('# Título **forte**')).toBe('Título forte');
    expect(noteExcerpt('x'.repeat(200), 120).length).toBeLessThanOrEqual(120);
  });
});

describe('filterNotes', () => {
  const all = [
    note({ id: 'a', title: 'Alpha', updatedAt: '2026-09-03T00:00:00.000Z', tags: ['dev'] }),
    note({ id: 'b', title: 'Beta', content: 'conteúdo especial', updatedAt: '2026-09-02T00:00:00.000Z', pinned: true }),
    note({ id: 'c', title: 'Gama', folder: 'trabalho', archived: true, updatedAt: '2026-09-04T00:00:00.000Z' }),
  ];

  it('fixadas primeiro, depois recentes; arquivadas ocultas por padrão', () => {
    const ids = filterNotes(all, { q: '', folder: '', showArchived: false }).map((n) => n.id);
    expect(ids).toEqual(['b', 'a']);
    expect(filterNotes(all, { q: '', folder: '', showArchived: true }).map((n) => n.id)).toEqual(['c']);
  });

  it('busca em título, conteúdo, pasta e etiquetas', () => {
    expect(filterNotes(all, { q: 'alpha', folder: '', showArchived: false }).map((n) => n.id)).toEqual(['a']);
    expect(filterNotes(all, { q: 'especial', folder: '', showArchived: false }).map((n) => n.id)).toEqual(['b']);
    expect(filterNotes(all, { q: 'dev', folder: '', showArchived: false }).map((n) => n.id)).toEqual(['a']);
    expect(filterNotes(all, { q: 'trabalho', folder: '', showArchived: true }).map((n) => n.id)).toEqual(['c']);
  });

  it('filtra por pasta', () => {
    expect(filterNotes(all, { q: '', folder: 'trabalho', showArchived: true }).map((n) => n.id)).toEqual(['c']);
    expect(filterNotes(all, { q: '', folder: 'casa', showArchived: false })).toEqual([]);
  });
});
