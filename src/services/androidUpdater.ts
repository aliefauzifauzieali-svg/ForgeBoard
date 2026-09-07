import { ANDROID_MANIFEST_URL } from './updateServer';

export type AndroidUpdateState =
  | { available: false; reason: 'not-native' | 'unconfigured' | 'up-to-date' | 'unreachable' | 'not-found' }
  | { available: true; version: string; bundleUrl: string; apkUrl: string | null };

export interface AndroidManifest {
  version?: unknown;
  android?: { version?: unknown; bundleUrl?: unknown; apkUrl?: unknown };
}

/** true somente no app nativo Android (Capacitor). */
export async function isNativeAndroid(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/** Compara `a.b.c` numericamente (-1/0/1). Não-numérico conta como 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => Number.parseInt(x, 10));
  const pb = b.split('.').map((x) => Number.parseInt(x, 10));
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = Number.isFinite(pa[i]) ? (pa[i] as number) : 0;
    const y = Number.isFinite(pb[i]) ? (pb[i] as number) : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Resolve o manifesto contra a versão instalada. Puro e testável:
 * `null` = manifesto sem seção Android utilizável.
 */
export function resolveAndroidUpdate(
  manifest: unknown,
  installed: string,
): { available: true; version: string; bundleUrl: string; apkUrl: string | null } | null {
  if (typeof manifest !== 'object' || manifest === null) return null;
  const android = (manifest as AndroidManifest).android;
  if (typeof android !== 'object' || android === null) return null;
  const { version, bundleUrl, apkUrl } = android;
  if (typeof version !== 'string' || typeof bundleUrl !== 'string' || version === '' || bundleUrl === '') {
    return null;
  }
  if (compareVersions(installed, version) >= 0) return null;
  return { available: true, version, bundleUrl, apkUrl: typeof apkUrl === 'string' ? apkUrl : null };
}

/**
 * Verifica atualização do app Android: baixa o manifesto da release,
 * compara com a versão embutida e oferece o bundle OTA (+ APK manual).
 * Sem seção Android no manifesto = `unconfigured`, sem rede além do GET.
 */
export async function checkAndroidUpdate(): Promise<AndroidUpdateState> {
  if (!(await isNativeAndroid())) return { available: false, reason: 'not-native' };
  let manifest: unknown;
  try {
    const res = await fetch(ANDROID_MANIFEST_URL, { cache: 'no-store' });
    if (res.status === 404) return { available: false, reason: 'not-found' };
    if (!res.ok) return { available: false, reason: 'unreachable' };
    manifest = (await res.json()) as unknown;
  } catch {
    return { available: false, reason: 'unreachable' };
  }
  const resolved = resolveAndroidUpdate(manifest, await builtinVersion());
  if (!resolved) {
    return { available: false, reason: hasAndroidSection(manifest) ? 'up-to-date' : 'unconfigured' };
  }
  return resolved;
}

function hasAndroidSection(manifest: unknown): boolean {
  return typeof manifest === 'object' && manifest !== null && 'android' in manifest;
}

async function builtinVersion(): Promise<string> {
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const current = await CapacitorUpdater.current();
    if (current.bundle.version) return current.bundle.version;
  } catch {
    /* ignore */
  }
  try {
    const { version } = await import('../../package.json');
    return version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Baixa o bundle web e marca para aplicar no próximo restart. A troca do
 * APK nativo continua manual (link `apkUrl` exibido na UI).
 */
export async function installAndroidUpdate(version: string, bundleUrl: string): Promise<void> {
  if (!(await isNativeAndroid())) throw new Error('Atualização Android disponível só no app nativo');
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  const bundle = await CapacitorUpdater.download({ url: bundleUrl, version });
  await CapacitorUpdater.set({ id: bundle.id });
}
