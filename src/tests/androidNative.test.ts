import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndroidUpdate } from '../services/androidUpdater';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
  CapacitorHttp: { get: vi.fn() },
}));

vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    current: async () => ({ bundle: { id: 'builtin', version: '1.5.0', downloaded: '', checksum: '', status: 'success' } }),
  },
}));

async function httpMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = (await import('@capacitor/core')) as unknown as {
    CapacitorHttp: { get: ReturnType<typeof vi.fn> };
  };
  return mod.CapacitorHttp.get;
}

const MANIFEST = {
  version: '1.5.3',
  android: {
    version: '1.5.3',
    bundleUrl: 'https://ex.com/forgeboard-web-v1.5.3.zip',
    apkUrl: 'https://ex.com/forgeboard-v1.5.3.apk',
  },
};

describe('androidUpdater (nativo simulado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa HTTP nativo e detecta update', async () => {
    const get = await httpMock();
    get.mockResolvedValueOnce({ status: 200, data: MANIFEST });
    const state = await checkAndroidUpdate();
    expect(get).toHaveBeenCalledWith({
      url: 'https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases/latest/download/latest.json',
    });
    expect(state).toEqual({
      available: true,
      version: '1.5.3',
      bundleUrl: 'https://ex.com/forgeboard-web-v1.5.3.zip',
      apkUrl: 'https://ex.com/forgeboard-v1.5.3.apk',
    });
  });

  it('404 vira not-found e 500 vira unreachable', async () => {
    const get = await httpMock();
    get.mockResolvedValueOnce({ status: 404, data: null });
    await expect(checkAndroidUpdate()).resolves.toEqual({ available: false, reason: 'not-found' });
    get.mockResolvedValueOnce({ status: 500, data: null });
    await expect(checkAndroidUpdate()).resolves.toEqual({ available: false, reason: 'unreachable' });
    get.mockRejectedValueOnce(new Error('offline'));
    await expect(checkAndroidUpdate()).resolves.toEqual({ available: false, reason: 'unreachable' });
  });
});
