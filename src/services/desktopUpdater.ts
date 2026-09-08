import { isTauri } from '../utils/platform';

export interface BinaryUpdateInfo {
  available: boolean;
  version: string | null;
  currentVersion: string | null;
}

/**
 * Verifica atualização do BINÁRIO (instalador .msi/-setup.exe) via plugin
 * oficial: compara a versão do executável com o `latest.json` da release.
 * É o que faltava — o OTA acima só troca o frontend.
 */
export async function checkBinaryUpdate(): Promise<BinaryUpdateInfo> {
  if (!isTauri()) return { available: false, version: null, currentVersion: null };
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
  if (!update) return { available: false, version: null, currentVersion: null };
  return { available: true, version: update.version, currentVersion: update.currentVersion };
}

/**
 * Baixa e instala o novo binário (NSIS/MSI) e encerra o app para o
 * instalador assumir (no Windows ele reinicia o app). Requer confirmação
 * explícita da UI. Progresso em % quando o tamanho é conhecido.
 * Com `reinstall: true`, baixa e aplica mesmo sem versão nova (reparo).
 */
export async function installBinaryUpdate(
  onProgress?: (pct: number) => void,
  opts?: { reinstall?: boolean },
): Promise<void> {
  if (!isTauri()) throw new Error('Atualização do aplicativo disponível só no Tauri');
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check(opts?.reinstall === true ? { allowDowngrades: true } : undefined);
  if (!update) return;
  let total = 0;
  let received = 0;
  onProgress?.(0);
  await update.downloadAndInstall((ev) => {
    if (ev.event === 'Started') {
      total = ev.data.contentLength ?? 0;
      received = 0;
    } else if (ev.event === 'Progress') {
      received += ev.data.chunkLength;
      if (total > 0) onProgress?.(Math.min(99, Math.round((received / total) * 100)));
    } else if (ev.event === 'Finished') {
      onProgress?.(100);
    }
  });
}
