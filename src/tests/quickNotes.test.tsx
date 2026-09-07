import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_NOTES_LENGTH, persistQuickNotes, readQuickNotes } from '../storage/boardStorage';
import { dangerouslyDeleteDatabase, setKV } from '../storage/idb';
import { KV_NOTES } from '../storage/idb';
import { QuickNotes } from '../features/dashboard/QuickNotes';

async function reset(): Promise<void> {
  localStorage.clear();
  await dangerouslyDeleteDatabase();
}

describe('quick notes (storage)', () => {
  beforeEach(reset);

  it('round-trip com teto de tamanho', async () => {
    expect(await readQuickNotes()).toBe('');
    await persistQuickNotes('olá');
    expect(await readQuickNotes()).toBe('olá');
    await persistQuickNotes('x'.repeat(MAX_NOTES_LENGTH + 10));
    expect((await readQuickNotes()).length).toBe(MAX_NOTES_LENGTH);
  });

  it('ignora payload inválido', async () => {
    await setKV(KV_NOTES, { nope: true });
    expect(await readQuickNotes()).toBe('');
  });
});

describe('QuickNotes (componente)', () => {
  beforeEach(reset);

  it('carrega, edita com debounce e indica estado', async () => {
    await persistQuickNotes('existente');
    const user = userEvent.setup();
    render(<QuickNotes />);
    expect(await screen.findByDisplayValue('existente')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');

    await user.type(screen.getByLabelText('Notas rápidas (salvas automaticamente neste dispositivo)'), '!');
    expect(screen.getByRole('status')).toHaveTextContent('Salvando…');
    await screen.findByText('Salvo', {}, { timeout: 3000 });
    expect(await readQuickNotes()).toBe('existente!');
  }, 10000);
});
