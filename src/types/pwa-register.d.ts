/**
 * Tipos do módulo virtual `virtual:pwa-register` (vite-plugin-pwa,
 * estratégia `generateSW`). Import dinâmico em `src/services/pwa.ts`,
 * então o Vitest nunca precisa resolvê-lo.
 */
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string, registration?: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}
