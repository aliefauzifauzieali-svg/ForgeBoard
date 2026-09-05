import { beforeEach, describe, expect, it } from 'vitest';
import { dangerouslyDeleteDatabase } from '../storage/idb';
import { useBoardStore } from '../stores/useBoardStore';

async function reset(): Promise<void> {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], tags: [], saveError: null, undoStack: [], redoStack: [] });
  await dangerouslyDeleteDatabase();
}

describe('useBoardStore — etiquetas', () => {
  beforeEach(reset);

  it('ensureTags cria, normaliza e reutiliza (case-insensitive)', () => {
    const ids = useBoardStore.getState().ensureTags(['Design', ' design ', 'URGENTE', '']);
    expect(ids).toHaveLength(2);
    expect(useBoardStore.getState().tags.map((t) => t.name)).toEqual(['design', 'urgente']);
    const again = useBoardStore.getState().ensureTags(['DESIGN']);
    expect(again).toEqual([ids[0]]);
    expect(useBoardStore.getState().tags).toHaveLength(2);
  });

  it('createTask associa tagIds e exibe via registro', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const ids = useBoardStore.getState().ensureTags(['frontend']);
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'T', tagIds: ids });
    expect(task.tagIds).toEqual(ids);
  });

  it('createTag rejeita vazio e devolve duplicada', () => {
    expect(() => useBoardStore.getState().createTag('   ')).toThrow();
    const a = useBoardStore.getState().createTag('Bug');
    expect(useBoardStore.getState().createTag('bug')).toBe(a);
  });

  it('updateTag renomeia e impede colisão', () => {
    const a = useBoardStore.getState().createTag('Alpha');
    useBoardStore.getState().createTag('Beta');
    useBoardStore.getState().updateTag(a.id, { name: 'Gamma', color: '#000000' });
    expect(useBoardStore.getState().tags.find((t) => t.id === a.id)).toMatchObject({
      name: 'gamma',
      color: '#000000',
    });
    expect(() => useBoardStore.getState().updateTag(a.id, { name: 'beta' })).toThrow();
  });

  it('deleteTag remove das tarefas e desfaz', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const [tagId] = useBoardStore.getState().ensureTags(['x']);
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'T', tagIds: tagId ? [tagId] : [] });
    useBoardStore.getState().deleteTag(tagId ?? '');
    expect(useBoardStore.getState().tags).toHaveLength(0);
    expect(useBoardStore.getState().tasks.find((t) => t.id === task.id)?.tagIds).toEqual([]);
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().tags).toHaveLength(1);
    expect(useBoardStore.getState().tasks.find((t) => t.id === task.id)?.tagIds).toEqual([tagId]);
  });
});
