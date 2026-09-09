import { beforeEach, describe, expect, it } from 'vitest';
import { renderMarkdown } from '../services/markdown';
import { getKV, KV_NOTE_DOCS } from '../storage/idb';
import { useNoteStore } from '../stores/useNoteStore';

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
});
