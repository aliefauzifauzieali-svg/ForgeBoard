/**
 * Endpoint OTA do app Android (servidor Capgo ou próprio, ver README
 * "Atualização do app Android"). Vazio = atualizações desligadas: nenhuma
 * verificação de rede acontece. Fonte única usada pelo `capacitor.config.ts`
 * e pelo serviço de update.
 */
export const ANDROID_UPDATE_URL = '';

/**
 * Manifesto estático de releases (lido via GET simples, sem protocolo
 * Capgo): o plugin não fala com arquivos estáticos, então a verificação
 * baixa este JSON e compara versões em JS. Gerado pelo CI junto à release.
 */
export const ANDROID_MANIFEST_URL =
  'https://github.com/aliefauzifauzieali-svg/ForgeBoard/releases/latest/download/latest.json';
