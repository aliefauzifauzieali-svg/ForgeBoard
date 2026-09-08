/**
 * Limpa caches temporários SEM tocar em dados (projetos, tarefas, backups,
 * preferências). Alivia "interface velha presa" do WebView/Service Worker.
 * Requer internet no reload seguinte (recarrega recursos do zero).
 */
export async function clearAppCache(): Promise<void> {
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window && window.caches?.keys) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => false)));
    }
  } catch {
    /* ignore */
  }
}
