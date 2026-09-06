import { useEffect, useRef, useState } from 'react';

/** Duração padrão da saída (mantém sincronia com `animate-fade-out` no Tailwind). */
export const EXIT_MS = 160;

/**
 * Desmontagem com atraso para animação de saída.
 *
 * `open=false` fecha na hora (lógica, foco, scroll) e devolve `leaving=true`
 * por `delayMs` para aplicar classes de saída; depois desmonta
 * (`rendered=false`). Reabrir no meio da saída cancela o temporizador.
 * `onClosed` (opcional) roda ao desmontar — ex.: limpar estado interno.
 */
export function useDelayedUnmount(
  open: boolean,
  delayMs: number = EXIT_MS,
  onClosed?: () => void,
): { rendered: boolean; leaving: boolean } {
  const [rendered, setRendered] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const closedRef = useRef(onClosed);
  useEffect(() => {
    closedRef.current = onClosed;
  }, [onClosed]);

  /* eslint-disable react/set-state-in-effect -- sincroniza estado com um temporizador externo (saída animada); o padrão intencional aqui é montar → animar saída → desmontar. */
  useEffect(() => {
    if (open) {
      setRendered(true);
      setLeaving(false);
      return;
    }
    if (!rendered) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setRendered(false);
      setLeaving(false);
      closedRef.current?.();
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [open, rendered, delayMs]);
  /* eslint-enable react/set-state-in-effect */

  return { rendered, leaving };
}
