import { ANDROID_UPDATE_URL } from './updateServer';

export type AndroidUpdateState =
  | { available: false; reason: 'not-native' | 'unconfigured' }
  | { available: false; reason: 'up-to-date' }
  | { available: true; version: string; url: string };

/** true somente no app nativo Android (Capacitor). */
export async function isNativeAndroid(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/**
 * Verifica atualização OTA do app Android (plugin Capgo). Sem servidor
 * configurado (`ANDROID_UPDATE_URL` vazio) retorna `unconfigured` sem rede.
 */
export async function checkAndroidUpdate(): Promise<AndroidUpdateState> {
  if (!(await isNativeAndroid())) return { available: false, reason: 'not-native' };
  if (!ANDROID_UPDATE_URL) return { available: false, reason: 'unconfigured' };
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  const latest = await CapacitorUpdater.getLatest({});
  const current = await CapacitorUpdater.current();
  if (!latest.version || !latest.url || latest.version === current.bundle.version) {
    return { available: false, reason: 'up-to-date' };
  }
  return { available: true, version: latest.version, url: latest.url };
}

/**
 * Baixa o bundle e marca para aplicar. A troca acontece ao reiniciar o
 * app (Android pede confirmação do usuário quando exigido pelo sistema).
 */
export async function installAndroidUpdate(version: string, url: string): Promise<void> {
  if (!(await isNativeAndroid())) throw new Error('Atualização Android disponível só no app nativo');
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  const bundle = await CapacitorUpdater.download({ url, version });
  await CapacitorUpdater.set({ id: bundle.id });
}
