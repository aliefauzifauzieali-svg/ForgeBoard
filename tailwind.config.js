/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.08)',
        pop: '0 12px 32px rgb(16 24 40 / 0.16)',
        glow: '0 10px 15px -3px var(--accent-glow)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'fade-out-scale': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
        },
        // Entrada de painéis (modais, paleta): fade + leve escala/spring.
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Entrada de toasts: desliza da direita com fade.
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        // Entradas usam `backwards` (não `both`): após a animação o fill
        // libera o `transform`, então hovers como `-translate-y-0.5`
        // continuam funcionando. Saídas mantêm `both` (seguram o fim).
        'fade-up': 'fade-up 200ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'fade-in': 'fade-in 150ms ease-out backwards',
        'fade-out': 'fade-out 160ms ease-in both',
        'fade-out-scale': 'fade-out-scale 160ms ease-in both',
        'pop-in': 'pop-in 220ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'toast-in': 'toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
      },
    },
  },
  plugins: [],
}
