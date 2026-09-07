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
