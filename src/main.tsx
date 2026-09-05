import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'
import { useBoardStore } from './stores/useBoardStore.ts'
import { useThemeStore } from './stores/useThemeStore.ts'
import { initPWA } from './services/pwa.ts'

// Hidratação explícita: os stores partem vazios e carregam o storage aqui,
// em vez de fazer I/O no momento do import (melhor para testes e SSR).
useBoardStore.getState().hydrate()
useThemeStore.getState().hydrate()
initPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
