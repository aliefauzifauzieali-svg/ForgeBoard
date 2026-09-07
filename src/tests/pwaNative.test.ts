import { afterEach, describe, expect, it } from 'vitest';
import { initPWA } from '../services/pwa';
import { useUIStore } from '../stores/useUIStore';

const WIN = window as unknown as Record<string, unknown>;
const SAVED_TAURI = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__');

afterEach(() => {
  if (SAVED_TAURI !== undefined) Object.defineProperty(window, '__TAURI_INTERNALS__', SAVED_TAURI);
  else delete WIN.__TAURI_INTERNALS__;
});

describe('initPWA fora do navegador', () => {
  it('no Tauri conclui sem registrar SW (sem crash)', () => {
    WIN.__TAURI_INTERNALS__ = {};
    useUIStore.setState({ online: true });
    expect(() => initPWA()).not.toThrow();
    // Listeners online/offline continuam ativos.
    expect(useUIStore.getState().online).toBe(true);
  });

  it('sem módulo virtual (dev/testes) conclui em silêncio', () => {
    expect(() => initPWA()).not.toThrow();
  });
});
