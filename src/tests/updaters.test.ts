import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkAndroidUpdate,
  compareVersions,
  installAndroidUpdate,
  isNativeAndroid,
  normalizeBody,
  resolveAndroidUpdate,
} from '../services/androidUpdater';
import { checkBinaryUpdate, checkDesktopUpdate, installBinaryUpdate, installDesktopUpdate } from '../services/desktopUpdater';
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

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }));

async function updaterCheckMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = (await import('@tauri-apps/plugin-updater')) as unknown as { check: ReturnType<typeof vi.fn> };
  return mod.check;
}

const WIN = window as unknown as Record<string, unknown>;
const SAVED_TAURI = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__');

async function invokeMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = (await import('@tauri-apps/api/core')) as unknown as { invoke: ReturnType<typeof vi.fn> };
  return mod.invoke;
}

describe('desktopUpdater (web)', () => {
  it('check fora do Tauri não há update', async () => {
    await expect(checkDesktopUpdate()).resolves.toEqual({ available: false, version: null, bundleUpdate: false });
  });

  it('install fora do Tauri lança', async () => {
    await expect(installDesktopUpdate()).rejects.toThrow(/só no Tauri/);
  });
});

describe('desktopUpdater (Tauri simulado)', () => {
  beforeEach(() => {
    WIN.__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    if (SAVED_TAURI !== undefined) Object.defineProperty(window, '__TAURI_INTERNALS__', SAVED_TAURI);
    else delete WIN.__TAURI_INTERNALS__;
  });

  it('check repassa check do backend e guarda pendência', async () => {
    const invoke = await invokeMock();
    invoke.mockResolvedValueOnce({ available: true, version: '9.9.9', bundle_update: false, bundle_version: '1.5.1' });
    await expect(checkDesktopUpdate()).resolves.toEqual({ available: true, version: '9.9.9', bundleUpdate: false });
    expect(invoke).toHaveBeenCalledWith('frontend_check');
  });

  it('install aplica, recarrega e avisa progresso', async () => {
    const invoke = await invokeMock();
    invoke.mockResolvedValueOnce({ available: true, version: '9.9.9', bundle_update: false, bundle_version: '1.5.1' });
    await checkDesktopUpdate();
    invoke.mockResolvedValueOnce(undefined);
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, configurable: true });
    const pct: number[] = [];
    await installDesktopUpdate((p) => pct.push(p));
    expect(invoke).toHaveBeenCalledWith('frontend_apply', { version: '9.9.9' });
    expect(pct[0]).toBe(0);
    expect(pct[pct.length - 1]).toBe(100);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('install sem pendência verifica antes', async () => {
    const invoke = await invokeMock();
    invoke.mockResolvedValueOnce({ available: false, version: null, bundle_update: false, bundle_version: '1.5.1' });
    await installDesktopUpdate();
    expect(invoke).toHaveBeenCalledWith('frontend_check');
  });
});

describe('binaryUpdater (web)', () => {
  it('check fora do Tauri não há update', async () => {
    await expect(checkBinaryUpdate()).resolves.toEqual({ available: false, version: null, currentVersion: null });
  });

  it('install fora do Tauri lança', async () => {
    await expect(installBinaryUpdate()).rejects.toThrow(/só no Tauri/);
  });
});

describe('binaryUpdater (Tauri simulado)', () => {
  beforeEach(() => {
    WIN.__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    if (SAVED_TAURI !== undefined) Object.defineProperty(window, '__TAURI_INTERNALS__', SAVED_TAURI);
    else delete WIN.__TAURI_INTERNALS__;
  });

  it('check sem update retorna indisponível', async () => {
    const check = await updaterCheckMock();
    check.mockResolvedValueOnce(null);
    await expect(checkBinaryUpdate()).resolves.toEqual({ available: false, version: null, currentVersion: null });
  });

  it('check com update repassa versão e atual', async () => {
    const check = await updaterCheckMock();
    check.mockResolvedValueOnce({ version: '9.9.9', currentVersion: '1.6.2' });
    await expect(checkBinaryUpdate()).resolves.toEqual({ available: true, version: '9.9.9', currentVersion: '1.6.2' });
  });

  it('install sem update não baixa nada', async () => {
    const check = await updaterCheckMock();
    check.mockClear();
    check.mockResolvedValueOnce(null);
    await installBinaryUpdate();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('install baixa com progresso acumulado e 100 no fim', async () => {
    const check = await updaterCheckMock();
    const downloadAndInstall = vi.fn(async (onEvent: (ev: unknown) => void) => {
      onEvent({ event: 'Started', data: { contentLength: 1000 } });
      onEvent({ event: 'Progress', data: { chunkLength: 400 } });
      onEvent({ event: 'Progress', data: { chunkLength: 600 } });
      onEvent({ event: 'Finished' });
    });
    check.mockResolvedValueOnce({ version: '9.9.9', currentVersion: '1.6.2', downloadAndInstall });
    const pct: number[] = [];
    await installBinaryUpdate((p) => pct.push(p));
    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(pct[0]).toBe(0);
    expect(pct).toContain(40);
    expect(pct[pct.length - 1]).toBe(100);
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

  it('estado not-found existe no tipo', async () => {
    const s: Awaited<ReturnType<typeof checkAndroidUpdate>> = { available: false, reason: 'not-found' };
    expect(s.reason).toBe('not-found');
  });

  it('compareVersions numérico por partes', () => {
    expect(compareVersions('1.5.0', '1.5.1')).toBe(-1);
    expect(compareVersions('1.5.1', '1.5.1')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
  });

  it('normalizeBody aceita objeto ou JSON em string', () => {
    const obj = { version: '1.5.4' };
    expect(normalizeBody(obj)).toBe(obj);
    expect(normalizeBody(JSON.stringify(obj))).toEqual(obj);
    expect(normalizeBody('lixo')).toBe('lixo');
  });
});
