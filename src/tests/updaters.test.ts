import { describe, expect, it } from 'vitest';
import { checkAndroidUpdate, installAndroidUpdate, isNativeAndroid } from '../services/androidUpdater';
import { checkDesktopUpdate, installDesktopUpdate } from '../services/desktopUpdater';
import { isTauri } from '../utils/platform';
import { ANDROID_UPDATE_URL } from '../services/updateServer';

describe('platform', () => {
  it('fora do Tauri retorna false', () => {
    expect(isTauri()).toBe(false);
  });
});

describe('updateServer', () => {
  it('sem servidor configurado por padrão', () => {
    expect(ANDROID_UPDATE_URL).toBe('');
  });
});

describe('desktopUpdater (web)', () => {
  it('check fora do Tauri não há update', async () => {
    await expect(checkDesktopUpdate()).resolves.toEqual({ available: false, version: null });
  });

  it('install fora do Tauri lança', async () => {
    await expect(installDesktopUpdate()).rejects.toThrow(/só no Tauri/);
  });
});

describe('androidUpdater (web)', () => {
  it('não é Android nativo no jsdom', async () => {
    await expect(isNativeAndroid()).resolves.toBe(false);
  });

  it('check fora do nativo retorna not-native sem rede', async () => {
    await expect(checkAndroidUpdate()).resolves.toEqual({ available: false, reason: 'not-native' });
  });

  it('install fora do nativo falha em vez de travar', async () => {
    await expect(installAndroidUpdate('1.0.0', 'https://example.com/b.zip')).rejects.toThrow();
  });
});
