import { beforeEach, describe, expect, it } from 'vitest';
import { flushPrefs } from '../storage/boardStorage';
import { dangerouslyDeleteDatabase, getKV, KV_PREFERENCES } from '../storage/idb';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useThemeStore } from '../stores/useThemeStore';
import type { UserPreferences } from '../types';

async function reset(): Promise<void> {
  localStorage.clear();
  usePrefsStore.setState({ shortcutsEnabled: true, lastView: { kind: 'dashboard' }, hydrated: false });
  useThemeStore.setState({ preference: 'system', resolved: 'light' });
  await dangerouslyDeleteDatabase();
}

describe('usePrefsStore', () => {
  beforeEach(reset);

  it('alterna atalhos e persiste', async () => {
    usePrefsStore.getState().setShortcutsEnabled(false);
    expect(usePrefsStore.getState().shortcutsEnabled).toBe(false);
    await flushPrefs();
    const stored = await getKV<UserPreferences>(KV_PREFERENCES);
    expect(stored?.shortcutsEnabled).toBe(false);
  });

  it('setLastView repetido não agenda persistência', async () => {
    usePrefsStore.getState().setLastView({ kind: 'dashboard' });
    await flushPrefs();
    expect(await getKV(KV_PREFERENCES)).toBeNull();

    usePrefsStore.getState().setLastView({ kind: 'calendar' });
    await flushPrefs();
    expect((await getKV<UserPreferences>(KV_PREFERENCES))?.lastView).toEqual({ kind: 'calendar' });
  });

  it('troca de tema grava prefs completas (tema + atalhos + visão)', async () => {
    useThemeStore.getState().setPreference('dark');
    await flushPrefs();
    expect(await getKV<UserPreferences>(KV_PREFERENCES)).toEqual({
      theme: 'dark',
      shortcutsEnabled: true,
      lastView: { kind: 'dashboard' },
    });
  });

  it('hydrate aplica prefs carregadas', () => {
    usePrefsStore.getState().hydrate({
      theme: 'dark',
      shortcutsEnabled: false,
      lastView: { kind: 'calendar' },
    });
    expect(usePrefsStore.getState().hydrated).toBe(true);
    expect(usePrefsStore.getState().lastView).toEqual({ kind: 'calendar' });
  });
});
