import { version as packageVersion } from '../../package.json';
import { isTauri } from '../utils/platform';

/** URL pública das releases (download manual e notas de versão). */
export const RELEASES_URL = 'https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases';

/**
 * Versão instalada: no desktop vem do bundle Tauri (`getVersion()`),
 * nas demais plataformas cai no `version` do package.json (mesma origem
 * do build web/PWA/APK).
 */
export async function getAppVersion(): Promise<string> {
  if (isTauri()) {
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      return await getVersion();
    } catch {
      /* cai no fallback abaixo */
    }
  }
  return packageVersion;
}

/**
 * Versão da interface em disco (pasta `frontend/` do desktop). É o código
 * que está RODANDO — pode ser mais nova que o bundle após update
 * incremental. Fora do Tauri, igual à versão do app.
 */
export async function getFrontendVersion(): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const v = await invoke<string>('frontend_version');
      if (v) return v;
    } catch {
      /* cai no fallback abaixo */
    }
  }
  return packageVersion;
}
