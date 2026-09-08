import { isTauri } from '../utils/platform';

export interface DesktopUpdateInfo {
  available: boolean;
  version: string | null;
  /** true quando há instalador novo (mudança nativa possível). */
  bundleUpdate: boolean;
}

interface CheckResult {
  available: boolean;
  version: string | null;
  bundle_update: boolean;
}

let pending: { version: string } | null = null;

/**
 * Verifica atualização do frontend desktop: compara a versão instalada
 * (pasta `frontend/`) com o `latest.json` da release. Sem rede além do GET
 * feito no Rust. Fora do Tauri retorna indisponível.
 */
export async function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  if (!isTauri()) return { available: false, version: null, bundleUpdate: false };
  const { invoke } = await import('@tauri-apps/api/core');
  const r = await invoke<CheckResult>('frontend_check');
  if (r.available && r.version) {
    pending = { version: r.version };
    return { available: true, version: r.version, bundleUpdate: r.bundle_update };
  }
  pending = null;
  return { available: false, version: null, bundleUpdate: r.bundle_update };
}

/**
 * Baixa o zip da versão, troca a pasta com backup e recarrega a janela —
 * sem reinstalar o `.exe`, sem admin. Requer confirmação explícita da UI.
 */
export async function installDesktopUpdate(onProgress?: (pct: number) => void): Promise<void> {
  if (!isTauri()) throw new Error('Atualização desktop disponível só no Tauri');
  let target = pending;
  if (!target) {
    const checked = await checkDesktopUpdate();
    if (!checked.available || !checked.version) return;
    target = { version: checked.version };
  }
  onProgress?.(0);
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('frontend_apply', { version: target.version });
  onProgress?.(100);
  pending = null;
  window.location.reload();
}

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
 */
export async function installBinaryUpdate(onProgress?: (pct: number) => void): Promise<void> {
  if (!isTauri()) throw new Error('Atualização do aplicativo disponível só no Tauri');
  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();
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
