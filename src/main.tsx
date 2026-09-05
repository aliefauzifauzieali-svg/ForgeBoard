import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'
import { bootApp, flushOnHide } from './services/boot.ts'
import { initPWA } from './services/pwa.ts'

async function main(): Promise<void> {
  initPWA();
  try {
    await bootApp();
  } catch (error) {
    // Boot nunca pode travar em tela de splash: o ErrorBoundary assume.
    console.error('[ForgeBoard] falha no boot:', error);
  }
  flushOnHide();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

void main()
