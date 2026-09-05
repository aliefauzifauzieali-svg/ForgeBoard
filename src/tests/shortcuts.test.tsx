import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { dangerouslyDeleteDatabase } from '../storage/idb';
import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useUIStore } from '../stores/useUIStore';

function key(keyName: string, init: Partial<KeyboardEventInit> = {}, target: EventTarget = window): void {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, ...init }));
  });
}

async function reset(): Promise<void> {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], tags: [], saveError: null, undoStack: [], redoStack: [] });
  usePrefsStore.setState({ shortcutsEnabled: true, lastView: { kind: 'dashboard' }, hydrated: false });
  useUIStore.setState({
    view: { kind: 'dashboard' },
    taskModal: { open: false, editingId: null, presetProjectId: null, presetStatus: null, presetDueDate: null },
    projectModal: { open: false, editingId: null },
    paletteOpen: false,
    shortcutsOpen: false,
    confirm: { open: false, title: '', description: '', confirmLabel: 'Confirmar', action: null },
    sidebarOpen: false,
  });
  await dangerouslyDeleteDatabase();
}

describe('atalhos de teclado (integração App)', () => {
  beforeEach(async () => {
    await reset();
    render(<App />);
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('N abre nova tarefa quando há projeto', () => {
    useBoardStore.getState().createProject({ name: 'Site' });
    key('n');
    expect(useUIStore.getState().taskModal.open).toBe(true);
  });

  it('ignora N digitando na pesquisa', () => {
    const input = screen.getByLabelText(/pesquisar tarefas/i);
    (input as HTMLElement).focus();
    key('n', {}, input);
    expect(useUIStore.getState().taskModal.open).toBe(false);
  });

  it('? abre atalhos e Esc fecha em cascata', () => {
    key('?');
    expect(useUIStore.getState().shortcutsOpen).toBe(true);
    key('Escape');
    expect(useUIStore.getState().shortcutsOpen).toBe(false);
  });

  it('Ctrl+K alterna a paleta', () => {
    key('k', { ctrlKey: true });
    expect(useUIStore.getState().paletteOpen).toBe(true);
    key('k', { ctrlKey: true });
    expect(useUIStore.getState().paletteOpen).toBe(false);
  });

  it('atalhos de letra respeitam a preferência desligada', () => {
    useBoardStore.getState().createProject({ name: 'Site' });
    usePrefsStore.getState().setShortcutsEnabled(false);
    key('n');
    expect(useUIStore.getState().taskModal.open).toBe(false);
    usePrefsStore.getState().setShortcutsEnabled(true);
  });
});
