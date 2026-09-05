import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function Boom(): React.JSX.Element {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra tela de recuperação em vez de quebrar', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeVisible();
    expect(screen.getByRole('button', { name: /exportar backup/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /recomeçar/i })).toBeVisible();
  });

  it('renderiza os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>conteúdo ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('conteúdo ok')).toBeVisible();
  });
});
