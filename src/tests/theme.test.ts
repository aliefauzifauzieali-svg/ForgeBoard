import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '../stores/useThemeStore';
import { THEME_KEY } from '../utils/constants';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ preference: 'system', resolved: 'light' });
  });

  it('alterna preferência e espelha no localStorage', () => {
    useThemeStore.getState().setPreference('dark');
    expect(useThemeStore.getState().preference).toBe('dark');
    expect(useThemeStore.getState().resolved).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('hydrate lê o espelho e resolve sistema como claro sem matchMedia', () => {
    localStorage.setItem(THEME_KEY, 'light');
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().preference).toBe('light');
    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('ignora valor inválido no espelho', () => {
    localStorage.setItem(THEME_KEY, 'neon');
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().preference).toBe('system');
  });
});
