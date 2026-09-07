import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ACCENT_OPTIONS, accentById, applyAccent, useAccentStore } from '../stores/useAccentStore';
import { SettingsModal } from '../components/settings/SettingsModal';
import { useUIStore } from '../stores/useUIStore';

describe('useAccentStore', () => {
  it('padrão índigo e troca com persistência', () => {
    localStorage.clear();
    useAccentStore.setState({ accentId: 'indigo' });
    expect(accentById('indigo').base).toBe('#4f46e5');
    expect(accentById('inexistente').id).toBe('indigo');
    useAccentStore.getState().setAccent('emerald');
    expect(useAccentStore.getState().accentId).toBe('emerald');
    expect(localStorage.getItem('forgeboard:accent')).toBe('emerald');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#047857');
    useAccentStore.getState().setAccent('indigo');
  });

  it('aplica todas as variáveis', () => {
    applyAccent(ACCENT_OPTIONS[4]!);
    const root = document.documentElement.style;
    expect(root.getPropertyValue('--accent')).toBe('#0369a1');
    expect(root.getPropertyValue('--accent-dark')).toBe('#075985');
    expect(root.getPropertyValue('--accent-bright')).toBe('#38bdf6');
    expect(root.getPropertyValue('--accent-glow')).toBe('rgb(3 105 161 / 0.25)');
    applyAccent(ACCENT_OPTIONS[0]!);
  });

  it('todas as opções têm rótulo e cores', () => {
    expect(ACCENT_OPTIONS.length).toBeGreaterThanOrEqual(4);
    for (const a of ACCENT_OPTIONS) {
      expect(a.label).toBeTruthy();
      expect(a.base).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('SettingsModal (accent)', () => {
  it('seletor de cor marca a atual', async () => {
    const user = userEvent.setup();
    useAccentStore.getState().setAccent('rose');
    useUIStore.setState({ settingsOpen: true });
    try {
      const { unmount } = render(<SettingsModal />);
      try {
        expect(screen.getByRole('radio', { name: 'Cor de destaque Rosa' })).toHaveAttribute('aria-checked', 'true');
        await user.click(screen.getByRole('radio', { name: 'Cor de destaque Âmbar' }));
        expect(useAccentStore.getState().accentId).toBe('amber');
      } finally {
        unmount();
      }
    } finally {
      useUIStore.setState({ settingsOpen: false });
      useAccentStore.getState().setAccent('indigo');
    }
  });
});
