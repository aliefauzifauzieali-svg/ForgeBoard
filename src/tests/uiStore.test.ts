import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  useUIStore.setState({
    toasts: [],
    paletteOpen: false,
    shortcutsOpen: false,
    announcement: { id: 0, message: '' },
  });
}

describe('useUIStore — toasts, paleta e anúncios', () => {
  beforeEach(reset);

  it('empilha toasts com id e dispensa por id', () => {
    useUIStore.getState().pushToast({ kind: 'success', message: 'Feito' });
    useUIStore.getState().pushToast({ kind: 'error', message: 'Falhou' });
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0]?.id).toBeTruthy();
    expect(toasts[0]?.id).not.toBe(toasts[1]?.id);
    useUIStore.getState().dismissToast(toasts[0]?.id ?? '');
    expect(useUIStore.getState().toasts.map((t) => t.message)).toEqual(['Falhou']);
  });

  it('limita a pilha aos 5 mais recentes', () => {
    for (let i = 0; i < 7; i++) {
      useUIStore.getState().pushToast({ kind: 'info', message: `M${i}` });
    }
    const messages = useUIStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(['M2', 'M3', 'M4', 'M5', 'M6']);
  });

  it('alterna paleta e diálogo de atalhos', () => {
    expect(useUIStore.getState().paletteOpen).toBe(false);
    useUIStore.getState().togglePalette();
    expect(useUIStore.getState().paletteOpen).toBe(true);
    useUIStore.getState().setPaletteOpen(false);
    expect(useUIStore.getState().paletteOpen).toBe(false);
    useUIStore.getState().setShortcutsOpen(true);
    expect(useUIStore.getState().shortcutsOpen).toBe(true);
  });

  it('anuncia com id crescente (releitura da mesma mensagem)', () => {
    useUIStore.getState().announce('Olá');
    const first = useUIStore.getState().announcement;
    useUIStore.getState().announce('Olá');
    const second = useUIStore.getState().announcement;
    expect(second.id).toBeGreaterThan(first.id);
    expect(second.message).toBe('Olá');
  });
});
