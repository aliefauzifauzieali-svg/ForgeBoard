import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBoard } from '../storage/boardStorage';
import { useBoardStore } from '../stores/useBoardStore';
import { STORAGE_KEY } from '../utils/constants';
import type { BoardData } from '../types';

function reset(): void {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], saveError: null });
}

describe('useBoardStore — tarefas', () => {
  beforeEach(reset);

  it('cria tarefa com valores padrão e persiste no localStorage', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: '  Deploy  ' });

    expect(task.title).toBe('Deploy');
    expect(task.status).toBe('backlog');
    expect(task.priority).toBe('medium');
    expect(task.createdAt).toBeTruthy();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toContain('Deploy');
    expect(useBoardStore.getState().tasks).toHaveLength(1);
  });

  it('rejeita tarefa sem título', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    expect(() => useBoardStore.getState().createTask({ projectId: project.id, title: '   ' })).toThrow();
  });

  it('altera status (moveTask) e atualiza updatedAt', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Bug' });
    useBoardStore.getState().moveTask(task.id, 'in-progress');
    expect(useBoardStore.getState().tasks[0]?.status).toBe('in-progress');
    useBoardStore.getState().moveTask(task.id, 'done');
    expect(useBoardStore.getState().tasks[0]?.status).toBe('done');
  });

  it('duplica tarefa com novo id e sufixo (cópia)', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Original' });
    const copy = useBoardStore.getState().duplicateTask(task.id);
    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(task.id);
    expect(copy?.title).toContain('(cópia)');
    expect(useBoardStore.getState().tasks).toHaveLength(2);
  });

  it('exclui projeto em cascata com suas tarefas', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    useBoardStore.getState().createTask({ projectId: project.id, title: 'A' });
    useBoardStore.getState().deleteProject(project.id);
    expect(useBoardStore.getState().projects).toHaveLength(0);
    expect(useBoardStore.getState().tasks).toHaveLength(0);
  });

  it('substitui todos os dados (import) e recarrega do storage', () => {
    const project = useBoardStore.getState().createProject({ name: 'Antigo' });
    expect(useBoardStore.getState().projects).toHaveLength(1);
    useBoardStore.getState().replaceAll({ version: 1, projects: [], tasks: [] });
    expect(useBoardStore.getState().projects).toHaveLength(0);
    expect(project.id).toBeTruthy();
  });

  it('ignora atualização com nome/título vazios', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    useBoardStore.getState().updateProject(project.id, { name: '   ' });
    expect(useBoardStore.getState().projects[0]?.name).toBe('Site');

    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Deploy' });
    useBoardStore.getState().updateTask(task.id, { title: '' });
    expect(useBoardStore.getState().tasks[0]?.title).toBe('Deploy');
  });

  it('moveTask para o mesmo status é no-op (sem bump de updatedAt)', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Bug' });
    const before = useBoardStore.getState().tasks[0]?.updatedAt;
    useBoardStore.getState().moveTask(task.id, 'backlog');
    expect(useBoardStore.getState().tasks[0]?.updatedAt).toBe(before);
  });

  it('atualiza o prazo da tarefa (usado pelo calendário)', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Com prazo' });
    expect(task.dueDate).toBeNull();
    useBoardStore.getState().updateTask(task.id, { dueDate: '2026-09-10' });
    expect(useBoardStore.getState().tasks[0]?.dueDate).toBe('2026-09-10');
    useBoardStore.getState().updateTask(task.id, { dueDate: null });
    expect(useBoardStore.getState().tasks[0]?.dueDate).toBeNull();
  });

  it('registra previousStatus ao concluir', () => {
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    const task = useBoardStore.getState().createTask({ projectId: project.id, title: 'Bug' });
    useBoardStore.getState().moveTask(task.id, 'in-progress');
    useBoardStore.getState().moveTask(task.id, 'done');
    expect(useBoardStore.getState().tasks[0]?.previousStatus).toBe('in-progress');
  });

  it('sinaliza saveError quando o storage falha e limpa ao recuperar', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    try {
      useBoardStore.getState().createProject({ name: 'Site' });
      expect(useBoardStore.getState().saveError).toMatch(/backup/);
    } finally {
      spy.mockRestore();
    }
    const projectId = useBoardStore.getState().projects[0]?.id ?? '';
    useBoardStore.getState().createTask({ projectId, title: 'T' });
    expect(useBoardStore.getState().saveError).toBeNull();
  });

  it('hydrate carrega dados do storage uma única vez', () => {
    const data: BoardData = {
      version: 1,
      projects: [
        {
          id: 'p1',
          name: 'P1',
          description: '',
          color: '#6366f1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      tasks: [],
    };
    saveBoard(data);
    useBoardStore.getState().hydrate();
    expect(useBoardStore.getState().projects).toHaveLength(1);
    localStorage.clear();
    useBoardStore.getState().hydrate();
    expect(useBoardStore.getState().projects).toHaveLength(1);
  });
});
