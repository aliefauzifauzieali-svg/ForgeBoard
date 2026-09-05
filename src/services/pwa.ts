import { useUIStore } from '../stores/useUIStore';

/** Evento do navegador quando o PWA pode ser instalado. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;

/**
 * Inicializa o PWA (chamado uma vez no boot em main.tsx):
 * registra o service worker em modo `prompt` (atualiza só com confirmação),
 * observa online/offline e captura o prompt de instalação.
 * Fora do build com o plugin, tudo vira no-op silencioso.
 */
export function initPWA(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const ui = (): ReturnType<typeof useUIStore.getState> => useUIStore.getState();

  const syncOnline = (): void => ui().setOnline(window.navigator.onLine);
  syncOnline();
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ui().setInstallAvailable(true);
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    ui().setInstallAvailable(false);
    ui().pushToast({ kind: 'success', message: 'ForgeBoard instalado. Boa produtividade!' });
  });

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      updateSW = registerSW({
        immediate: true,
        onOfflineReady() {
          ui().pushToast({ kind: 'success', message: 'Pronto para uso offline' });
        },
        onNeedRefresh() {
          ui().pushToast({
            kind: 'info',
            message: 'Nova versão disponível',
            action: { label: 'Atualizar', run: applyUpdate },
          });
        },
        onRegisterError(error: unknown) {
          console.error('[ForgeBoard] falha ao registrar o service worker:', error);
        },
      });
    })
    .catch(() => {
      /* sem plugin/SW (dev sem build, testes): app segue 100% funcional */
    });
}

/** Aplica a versão em espera: avisa o SW e recarrega (com fallback por timeout). */
function applyUpdate(): void {
  void updateSW?.(true);
  // Se o evento `controlling` do plugin não recarregar (corrida de ciclo de
  // vida), este timeout garante que a nova versão assuma. Roda somente após
  // confirmação explícita; se o plugin já recarregou, o timer morre junto.
  window.setTimeout(() => window.location.reload(), 2500);
}

/** Abre o prompt de instalação do navegador. Retorna se foi aceito. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt = null;
    try {
      useUIStore.getState().setInstallAvailable(false);
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}
