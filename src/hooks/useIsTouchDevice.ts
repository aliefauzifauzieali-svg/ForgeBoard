import { useEffect, useState } from 'react';

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    return true;
  }
  return false;
}

/**
 * Detecta dispositivo touch (`ontouchstart`, `maxTouchPoints` ou
 * `pointer: coarse`). Reage a mudanças do pointer. Usado só para
 * apresentação (ocultar dicas de teclado); a lógica dos atalhos não muda.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(detectTouch);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (e: MediaQueryListEvent): void => {
      setIsTouch(e.matches || detectTouch());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}
