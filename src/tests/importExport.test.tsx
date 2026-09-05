import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DataButtons } from '../components/layout/Sidebar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useBoardStore } from '../stores/useBoardStore';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  localStorage.clear();
  useBoardStore.setState({ projects: [], tasks: [], saveError: null, undoStack: [], redoStack: [] });
  useUIStore.setState({
    toasts: [],
    confirm: { open: false, title: '', description: '', confirmLabel: 'Confirmar', action: null },
  });
}

const VALID_JSON = JSON.stringify({
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Importado',
      description: '',
      color: '#6366f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  tasks: [],
});

/** jsdom não implementa `File.text()`: injeta o conteúdo diretamente. */
function makeFile(name: string, content: string): File {
  const file = new File([content], name, { type: 'application/json' });
  (file as unknown as { text: () => Promise<string> }).text = async () => content;
  return file;
}

const VALID_FILE = makeFile('board.json', VALID_JSON);

describe('DataButtons — importação', () => {
  beforeEach(reset);

  it('arquivo válido abre confirmação e importar gera toast', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DataButtons />
        <ConfirmDialog />
      </>,
    );
    const input = screen.getByLabelText(/selecionar arquivo json/i);
    await user.upload(input, VALID_FILE);

    await waitFor(() => {
      expect(useUIStore.getState().confirm.open).toBe(true);
    });
    expect(screen.getByText(/serão substituídos/i)).toBeInTheDocument();

    // Confirma: dados entram + toast de sucesso é enfileirado.
    useUIStore.getState().confirm.action?.();
    expect(useBoardStore.getState().projects.map((p) => p.name)).toEqual(['Importado']);
    expect(useUIStore.getState().toasts.map((t) => t.message).join('|')).toMatch(/dados importados/i);
  });

  it('arquivo inválido mostra erro sem pedir confirmação', async () => {
    const user = userEvent.setup();
    render(<DataButtons />);
    await user.upload(
      screen.getByLabelText(/selecionar arquivo json/i),
      makeFile('bad.json', '{json quebrado'),
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/arquivo inválido/i);
    });
    expect(useUIStore.getState().confirm.open).toBe(false);
  });
});
