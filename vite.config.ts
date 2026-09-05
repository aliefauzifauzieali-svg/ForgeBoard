import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Registro manual em src/services/pwa.ts (toasts próprios de update/offline).
      injectRegister: false,
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'ForgeBoard — Projetos e Tarefas',
        short_name: 'ForgeBoard',
        description: 'Workspace pessoal para projetos e tarefas. Rápido, offline e local-first.',
        lang: 'pt-BR',
        dir: 'ltr',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        categories: ['productivity', 'utilities'],
        theme_color: '#4f46e5',
        background_color: '#f4f4f5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App 100% local: precacheia o shell; navegação cai no index (SPA).
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Atualização só com confirmação do usuário (ver pwa.ts).
        // clientsClaim faz a primeira visita ser controlada de imediato
        // (offline mais rápido); updates continuam aguardando confirmação.
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', 'src/**/*.test.{ts,tsx}', '**/*.config.*'],
    },
  },
})
