import { beforeEach, describe, expect, it } from 'vitest';
import { useBoardStore } from '../stores/useBoardStore';

function reset(): void {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], saveError: null, undoStack: [], redoStack: [] });
}

describe('useBoardStore — undo/redo', () => {
  beforeEach(reset);

  it('desfaz criação (projeto some, refaz volta)', () => {
    useBoardStore.getState().createProject({ name: 'Site' });
    expect(useBoardStore.getState().projects).toHaveLength(1);
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().projects).toHaveLength(0);
    useBoardStore.getState().redo();
    expect(useBoardStore.getState().projects).toHaveLength(1);
    expect(useBoardStore.getState().projects[0]?.name).toBe('Site');
  });

  it('desfaz exclusão restaurando tarefas, e refaz', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'A' });
    useBoardStore.getState().deleteProject(project.id);
    expect(useBoardStore.getState().tasks).toHaveLength(0);

    useBoardStore.getState().undo();
    expect(useBoardStore.getState().projects.map((p) => p.id)).toEqual([project.id]);
    expect(useBoardStore.getState().tasks.map((t) => t.id)).toEqual([task.id]);

    useBoardStore.getState().redo();
    expect(useBoardStore.getState().projects).toHaveLength(0);
    expect(useBoardStore.getState().tasks).toHaveLength(0);
  });

  it('desfaz movimento restaurando status e previousStatus', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Bug' });
    useBoardStore.getState().moveTask(task.id, 'in-progress');
    useBoardStore.getState().moveTask(task.id, 'done');
    expect(useBoardStore.getState().tasks[0]?.previousStatus).toBe('in-progress');

    useBoardStore.getState().undo();
    expect(useBoardStore.getState().tasks[0]?.status).toBe('in-progress');
  });

  it('nova ação limpa o redo', () => {
    useBoardStore.getState().createProject({ name: 'A' });
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().redoStack).toHaveLength(1);
    useBoardStore.getState().createProject({ name: 'B' });
    expect(useBoardStore.getState().redoStack).toHaveLength(0);
    expect(useBoardStore.getState().projects.map((p) => p.name)).toEqual(['B']);
  });

  it('undo sem histórico é no-op e persiste o resultado', () => {
    useBoardStore.getState().undo();
    useBoardStore.getState().redo();
    expect(useBoardStore.getState().projects).toHaveLength(0);
  });

  it('desfaz importação (replaceAll)', () => {
    const project = useBoardStore.getState().createProject({ name: 'Antigo' });
    useBoardStore.getState().replaceAll({ version: 1, projects: [], tasks: [] });
    expect(useBoardStore.getState().projects).toHaveLength(0);
    useBoardStore.getState().undo();
    expect(useBoardStore.getState().projects.map((p) => p.id)).toEqual([project.id]);
  });

  it('limita o histórico a 30 instantâneos', () => {
    for (let i = 0; i < 35; i++) {
      useBoardStore.getState().createProject({ name: `P${i}` });
    }
    expect(useBoardStore.getState().undoStack.length).toBeLessThanOrEqual(30);
  });
});
