import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../components/ui/Modal';

describe('Modal — focus trap', () => {
  it('mantém o Tab circulando dentro do diálogo', async () => {
    const user = userEvent.setup();
    render(
      <Modal open title="Diálogo" description="Descrição" onClose={vi.fn()}>
        <button type="button">Ação A</button>
        <button type="button">Ação B</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Diálogo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-describedby');

    // Aguarda o foco inicial (efeito com timeout de 30ms) pousar em "Ação A".
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Ação A' })).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('button', { name: 'Ação B' })).toHaveFocus();

    // No último item, Tab volta ao primeiro focável (botão fechar).
    await user.tab();
    expect(screen.getByRole('button', { name: /fechar diálogo/i })).toHaveFocus();
  });

  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <Modal open={false} title="Diálogo" onClose={vi.fn()}>
        <button type="button">Ação</button>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
