import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { ShortcutsDialog } from '../components/ui/ShortcutsDialog';
import { useUIStore } from '../stores/useUIStore';

const WIN = window as unknown as Record<string, unknown>;
// jsdom expõe `ontouchstart`: guarda o descritor para restaurar depois.
const SAVED_TOUCH = Object.getOwnPropertyDescriptor(window, 'ontouchstart');

function stubTouch({ touchPoints, coarse, ontouch }: { touchPoints?: number; coarse?: boolean; ontouch?: boolean }): void {
  if (ontouch || SAVED_TOUCH === undefined) {
    WIN.ontouchstart = null;
  } else {
    delete WIN.ontouchstart;
  }
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: touchPoints ?? 0, configurable: true });
  if (coarse === undefined) {
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
  } else {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({
        matches: coarse,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      configurable: true,
    });
  }
}

afterEach(() => {
  if (SAVED_TOUCH !== undefined) Object.defineProperty(window, 'ontouchstart', SAVED_TOUCH);
  else delete WIN.ontouchstart;
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 0, configurable: true });
  Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

describe('useIsTouchDevice', () => {
  it('retorna false no desktop sem toque', () => {
    stubTouch({});
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(false);
  });

  it('retorna true com ontouchstart', () => {
    stubTouch({ ontouch: true });
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(true);
  });

  it('retorna true com maxTouchPoints', () => {
    stubTouch({ touchPoints: 5 });
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(true);
  });

  it('retorna true com pointer: coarse', () => {
    stubTouch({ coarse: true });
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(true);
  });
});

describe('ShortcutsDialog no touch', () => {
  it('mostra texto alternativo em vez da tabela', () => {
    stubTouch({ touchPoints: 2 });
    useUIStore.setState({ shortcutsOpen: true });
    try {
      render(<ShortcutsDialog />);
      expect(screen.getByText(/precisam de teclado físico/i)).toBeVisible();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    } finally {
      useUIStore.setState({ shortcutsOpen: false });
    }
  });

  it('mostra a tabela no desktop', () => {
    stubTouch({});
    useUIStore.setState({ shortcutsOpen: true });
    try {
      render(<ShortcutsDialog />);
      expect(screen.getByRole('table')).toBeVisible();
    } finally {
      useUIStore.setState({ shortcutsOpen: false });
    }
  });
});
