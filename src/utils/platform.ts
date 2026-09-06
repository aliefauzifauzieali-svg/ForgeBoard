/** true quando roda dentro do shell Tauri (desktop). Web/PWA/Capacitor: false. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
