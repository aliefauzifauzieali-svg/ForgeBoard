import type { CapacitorConfig } from '@capacitor/cli';
import { ANDROID_UPDATE_URL } from './src/services/updateServer';

const config: CapacitorConfig = {
  appId: 'com.forgeboard.app',
  appName: 'ForgeBoard',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.forgeboard.app',
      // Desligado até configurar um servidor de bundles (ver README
      // "Atualização do app Android"): sem updateUrl, nada é verificado.
      autoUpdate: false,
      updateUrl: ANDROID_UPDATE_URL,
      // Sem telemetria por padrão.
      statsUrl: '',
    },
  },
};

export default config;
