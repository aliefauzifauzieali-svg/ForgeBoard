import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CommandPalette } from '../features/palette/CommandPalette';
import { buildCommands, filterCommands } from '../features/palette/commands';
import { useBoardStore } from '../stores/useBoardStore';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], saveError: null, undoStack: [], redoStack: [] });
  useUIStore.setState({ paletteOpen: true, taskModal: { open: false, editingId: null, presetProjectId: null, presetStatus: null, presetDueDate: null }, view: { kind: 'dashboard' } });
}

describe('filterCommands', () => {
  it('retorna tudo sem query e filtra por texto/keywords sem acento', () => {
    const cmds = buildCommands();
    expect(filterCommands(cmds, '')).toHaveLength(cmds.length);
    expect(filterCommands(cmds, 'nova tarefa').map((c) => c.id)).toContain('new-task');
    expect(filterCommands(cmds, 'tema').map((c) => c.id)).toContain('toggle-theme');
    expect(filterCommands(cmds, 'xyz-nada').map((c) => c.id)).not.toContain('new-task');
  });
});

describe('CommandPalette', () => {
  beforeEach(reset);

  it('busca tarefa e Enter abre a edição', async () => {
    const user = userEvent.setup();
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    useBoardStore.getState().createTask({ projectId: project.id, title: 'Revisar proposta' });
    render(<CommandPalette />);

    const input = screen.getByRole('combobox', { name: /buscar comandos/i });
    await user.type(input, 'proposta');
    expect(await screen.findByRole('option', { name: /revisar proposta/i })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(useUIStore.getState().taskModal.open).toBe(true);
    expect(useUIStore.getState().paletteOpen).toBe(false);
  });

  it('setas navegam e Escape fecha', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    const input = screen.getByRole('combobox', { name: /buscar comandos/i });
    expect(input).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Escape}');
    expect(useUIStore.getState().paletteOpen).toBe(false);
  });

  it('mostra estado vazio sem resultados', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.type(screen.getByRole('combobox', { name: /buscar comandos/i }), 'zzz-nada-aqui');
    expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument();
  });

  it('executa comando de navegação por clique', async () => {
    const user = userEvent.setup();
    const project = useBoardStore.getState().createProject({ name: 'Site' });
    render(<CommandPalette />);
    await user.click(screen.getByRole('option', { name: `Abrir ${project.name}` }));
    expect(useUIStore.getState().view).toEqual({ kind: 'project', projectId: project.id });
  });
});
