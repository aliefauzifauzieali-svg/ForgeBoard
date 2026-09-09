import { create } from 'zustand';
import type { Note } from '../types';
import { generateId, nowIso } from '../utils/core';
import { getKV, KV_NOTE_DOCS, setKV } from '../storage/idb';

function sanitizeNote(raw: unknown): Note | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const n = raw as Partial<Note>;
  if (typeof n.id !== 'string' || n.id === '') return null;
  if (typeof n.createdAt !== 'string' || typeof n.updatedAt !== 'string') return null;
  return {
    id: n.id,
    title: typeof n.title === 'string' ? n.title.slice(0, 120) : '',
    content: typeof n.content === 'string' ? n.content.slice(0, 100_000) : '',
    tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === 'string').slice(0, 12) : [],
    color: typeof n.color === 'string' ? n.color : undefined,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function persist(notes: Note[]): void {
  void setKV(KV_NOTE_DOCS, notes).catch(() => {});
}

interface NoteState {
  notes: Note[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createNote: (input?: Partial<Pick<Note, 'title' | 'content' | 'color'>>) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'color' | 'tags'>>) => void;
  deleteNote: (id: string) => void;
}

/** Notas Markdown: CRUD + persistência em `kv.notes` (fora do board). */
export const useNoteStore = create<NoteState>()((set, get) => ({
  notes: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await getKV<unknown>(KV_NOTE_DOCS);
      const notes = Array.isArray(raw) ? raw.map(sanitizeNote).filter((n): n is Note => n !== null) : [];
      set({ notes, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  createNote: (input) => {
    const now = nowIso();
    const note: Note = {
      id: generateId(),
      title: input?.title ?? '',
      content: input?.content ?? '',
      tags: [],
      color: input?.color,
      createdAt: now,
      updatedAt: now,
    };
    const notes = [note, ...get().notes];
    set({ notes });
    persist(notes);
    return note;
  },

  updateNote: (id, patch) => {
    const notes = get().notes.map((n) =>
      n.id === id
        ? {
            ...n,
            title: patch.title !== undefined ? patch.title.slice(0, 120) : n.title,
            content: patch.content !== undefined ? patch.content.slice(0, 100_000) : n.content,
            color: patch.color !== undefined ? patch.color : n.color,
            tags: patch.tags !== undefined ? patch.tags.filter((t) => typeof t === 'string').slice(0, 12) : n.tags,
            updatedAt: nowIso(),
          }
        : n,
    );
    set({ notes });
    persist(notes);
  },

  deleteNote: (id) => {
    const notes = get().notes.filter((n) => n.id !== id);
    set({ notes });
    persist(notes);
  },
}));
