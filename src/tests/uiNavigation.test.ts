import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../services/taskQuery';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  useUIStore.setState({
    view: { kind: 'dashboard' },
    filters: DEFAULT_FILTERS,
    projectModal: { open: false, editingId: null },
    taskModal: { open: false, editingId: null, presetProjectId: null, presetStatus: null, presetDueDate: null },
    confirm: { open: false, title: '', description: '', confirmLabel: 'Confirmar', action: null },
    sidebarOpen: false,
    paletteOpen: false,
    shortcutsOpen: false,
    settingsOpen: false,
    toasts: [],
  });
}

describe('useUIStore — navegação e modais', () => {
  beforeEach(reset);

  it('navegação alterna a visão e fecha a sidebar', () => {
    const ui = () => useUIStore.getState();
    ui().setSidebarOpen(true);
    ui().goDashboard();
    expect(ui().view).toEqual({ kind: 'dashboard' });
    expect(ui().sidebarOpen).toBe(false);

    ui().openProject('p1');
    expect(ui().view).toEqual({ kind: 'project', projectId: 'p1' });

    ui().setSidebarOpen(true);
    ui().goCalendar();
    expect(ui().view).toEqual({ kind: 'calendar' });
    expect(ui().sidebarOpen).toBe(false);

    ui().goStats();
    expect(ui().view).toEqual({ kind: 'stats' });
  });

  it('modais abrem e fecham com estado correto', () => {
    const ui = () => useUIStore.getState();
    ui().openNewProject();
    expect(ui().projectModal).toEqual({ open: true, editingId: null });
    ui().openEditProject('p1');
    expect(ui().projectModal).toEqual({ open: true, editingId: 'p1' });
    ui().closeProjectModal();
    expect(ui().projectModal.open).toBe(false);

    ui().openNewTask('p9', 'done', '2026-09-10');
    expect(ui().taskModal).toEqual({
      open: true,
      editingId: null,
      presetProjectId: 'p9',
      presetStatus: 'done',
      presetDueDate: '2026-09-10',
    });
    ui().openEditTask('t1');
    expect(ui().taskModal.editingId).toBe('t1');
    ui().closeTaskModal();
    expect(ui().taskModal.open).toBe(false);
  });

  it('confirmação executa ação e limpa ao fechar', () => {
    const ui = () => useUIStore.getState();
    let ran = false;
    ui().askConfirm({ title: 'T', description: 'D', action: () => { ran = true; } });
    expect(ui().confirm.open).toBe(true);
    expect(ui().confirm.confirmLabel).toBe('Confirmar');
    ui().confirm.action?.();
    expect(ran).toBe(true);
    ui().closeConfirm();
    expect(ui().confirm.open).toBe(false);
    expect(ui().confirm.action).toBeNull();
  });

  it('palette, atalhos, settings e sidebar alternam', () => {
    const ui = () => useUIStore.getState();
    ui().togglePalette();
    expect(ui().paletteOpen).toBe(true);
    ui().setPaletteOpen(false);
    ui().setShortcutsOpen(true);
    expect(ui().shortcutsOpen).toBe(true);
    ui().setSettingsOpen(true);
    expect(ui().settingsOpen).toBe(true);
    ui().setSidebarOpen(true);
    expect(ui().sidebarOpen).toBe(true);
  });
});
