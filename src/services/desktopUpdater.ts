import { isTauri } from '../utils/platform';

export interface DesktopUpdateInfo {
  available: boolean;
  version: string | null;
}

/**
 * Verifica atualização do app desktop via tauri-plugin-updater
 * (`latest.json` do GitHub Releases, assinatura minisign).
 * Fora do Tauri retorna `{ available: false }` sem tocar na rede.
 */
export async function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  if (!isTauri()) return { available: false, version: null };
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
  if (!update) return { available: false, version: null };
  return { available: true, version: update.version };
}

/**
 * Baixa, instala e reinicia com a nova versão. Requer confirmação
 * explícita da UI antes de chamar (o relaunch fecha o app).
 */
export async function installDesktopUpdate(onProgress?: (pct: number) => void): Promise<void> {
  if (!isTauri()) throw new Error('Atualização desktop disponível só no Tauri');
  const { check } = await import('@tauri-apps/plugin-updater');
  const { relaunch } = await import('@tauri-apps/plugin-process');
  const update = await check();
  if (!update) return;
  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall((e) => {
    if (e.event === 'Started') {
      downloaded = 0;
      total = e.data.contentLength ?? 0;
      onProgress?.(0);
    } else if (e.event === 'Progress') {
      downloaded += e.data.chunkLength;
      if (total > 0) onProgress?.(Math.min(100, Math.round((downloaded / total) * 100)));
    } else if (e.event === 'Finished') {
      onProgress?.(100);
    }
  });
  await relaunch();
}
