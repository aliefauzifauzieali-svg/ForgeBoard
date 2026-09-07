import { describe, expect, it } from 'vitest';
import {
  checkAndroidUpdate,
  compareVersions,
  installAndroidUpdate,
  isNativeAndroid,
  resolveAndroidUpdate,
} from '../services/androidUpdater';
import { checkDesktopUpdate, installDesktopUpdate } from '../services/desktopUpdater';
import { RELEASES_URL, getAppVersion } from '../services/appInfo';
import { isTauri } from '../utils/platform';
import { ANDROID_UPDATE_URL } from '../services/updateServer';

describe('platform', () => {
  it('fora do Tauri retorna false', () => {
    expect(isTauri()).toBe(false);
  });
});

describe('appInfo', () => {
  it('fora do Tauri usa a versão do package.json', async () => {
    const { version } = await import('../../package.json');
    await expect(getAppVersion()).resolves.toBe(version);
  });

  it('aponta para as releases do GitHub', () => {
    expect(RELEASES_URL).toBe('https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases');
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

describe('resolveAndroidUpdate (puro)', () => {
  const manifest = {
    version: '1.5.1',
    android: { version: '1.5.1', bundleUrl: 'https://ex.com/web.zip', apkUrl: 'https://ex.com/app.apk' },
  };

  it('disponível quando o manifesto é mais novo', () => {
    expect(resolveAndroidUpdate(manifest, '1.5.0')).toEqual({
      available: true,
      version: '1.5.1',
      bundleUrl: 'https://ex.com/web.zip',
      apkUrl: 'https://ex.com/app.apk',
    });
  });

  it('null quando igual, mais velho ou sem seção utilizável', () => {
    expect(resolveAndroidUpdate(manifest, '1.5.1')).toBeNull();
    expect(resolveAndroidUpdate(manifest, '2.0.0')).toBeNull();
    expect(resolveAndroidUpdate({ version: '9.9.9' }, '1.0.0')).toBeNull();
    expect(resolveAndroidUpdate(null, '1.0.0')).toBeNull();
    expect(resolveAndroidUpdate({ android: { version: '2.0.0' } }, '1.0.0')).toBeNull();
  });

  it('compareVersions numérico por partes', () => {
    expect(compareVersions('1.5.0', '1.5.1')).toBe(-1);
    expect(compareVersions('1.5.1', '1.5.1')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
  });
});
