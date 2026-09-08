import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';

/** Atraso do toque longo (ms): evita conflito com a rolagem no touch. */
const TOUCH_DELAY_MS = 250;
/** Tolerância de movimento (px) antes do toque longo: virou rolagem. */
const TOUCH_TOLERANCE_PX = 12;
/** Limiar de movimento (px) para o mouse iniciar o arrasto (preserva clique). */
const MOUSE_THRESHOLD_PX = 6;
const EDGE_PX = 64;
const SCROLL_STEP = 14;

type Status = Task['status'];

/**
 * Coluna sob o ponto, por geometria (não por hit-test): funciona em
 * qualquer WebView, mesmo com o fantasma sob o cursor (ele tem
 * `pointer-events: none` e nem entraria no hit-test).
 */
function columnAt(x: number, y: number): Status | null {
  const cols = document.querySelectorAll('[data-column]');
  for (const el of Array.from(cols)) {
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      const value = el.dataset.column;
      if (value === 'backlog' || value === 'in-progress' || value === 'done') return value;
    }
  }
  return null;
}

function glowColumn(status: Status | null): void {
  document.querySelectorAll('[data-column].touch-drop-target').forEach((el) => {
    if ((el as HTMLElement).dataset.column !== status) el.classList.remove('touch-drop-target');
  });
  if (status) {
    document.querySelector(`[data-column="${status}"]`)?.classList.add('touch-drop-target');
  }
}

function clearColumnGlow(): void {
  document
    .querySelectorAll('[data-column].touch-drop-target')
    .forEach((el) => el.classList.remove('touch-drop-target'));
}

/**
 * Arrastar universal por Pointer Events (mouse + toque): um único caminho
 * para desktop e mobile, sem HTML5 DnD (quebrado no WebView2 com o handler
 * de file-drop ativo e inexistente no touch).
 *
 * - Mouse: arrasto inicia após 6px (clique continua funcionando).
 * - Toque: segura 250ms (rolagem curta cancela); `touch-action: pan-y` no
 *   card preserva a rolagem vertical nativa.
 * - Um fantasma (clone fixo, sem `data-testid`) segue o cursor/dedo via
 *   `transform` direto no DOM (sem re-render por movimento); a origem fica
 *   esmaecida. Soltura fora de coluna = sem-op. Esc cancela.
 * - Botões Mover seguem como fallback (não removidos).
 */
export function usePointerDrag(task: Task): {
  dragging: boolean;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
  };
} {
  const moveTask = useBoardStore((s) => s.moveTask);
  const [dragging, setDragging] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const grabOffset = useRef({ dx: 0, dy: 0 });
  const pointerId = useRef<number | null>(null);
  const isTouch = useRef(false);
  const draggingRef = useRef(false);
  const justDragged = useRef(false);
  const raf = useRef(0);
  const cardEl = useRef<HTMLElement | null>(null);
  const ghostEl = useRef<HTMLElement | null>(null);
  const stateRef = useRef({ id: task.id, status: task.status });
  useEffect(() => {
    stateRef.current = { id: task.id, status: task.status };
  });

  const stopScrollLoop = useCallback((): void => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  const scrollLoop = useCallback(function tick(): void {
    const pt = lastPt.current;
    if (!pt || !draggingRef.current) return;
    const { innerHeight, innerWidth } = window;
    let sx = 0;
    let sy = 0;
    if (pt.y < EDGE_PX) sy = -SCROLL_STEP;
    else if (pt.y > innerHeight - EDGE_PX) sy = SCROLL_STEP;
    if (pt.x < EDGE_PX) sx = -SCROLL_STEP;
    else if (pt.x > innerWidth - EDGE_PX) sx = SCROLL_STEP;
    if (sx !== 0 || sy !== 0) {
      const region = document.querySelector('[data-kanban-region]');
      if (sx !== 0 && region && region.scrollWidth > region.clientWidth) {
        region.scrollBy({ left: sx, behavior: 'auto' });
        sx = 0;
      }
      if (sx !== 0 || sy !== 0) window.scrollBy(sx, sy);
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  const cancelPress = useCallback((): void => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    origin.current = null;
    pointerId.current = null;
  }, []);

  const moveGhost = useCallback((x: number, y: number): void => {
    const ghost = ghostEl.current;
    if (!ghost) return;
    ghost.style.transform = `translate(${x - grabOffset.current.dx}px, ${y - grabOffset.current.dy}px) scale(1.03)`;
  }, []);

  const removeGhost = useCallback((): void => {
    ghostEl.current?.remove();
    ghostEl.current = null;
  }, []);

  const beginDrag = useCallback((): void => {
    const card = cardEl.current;
    const o = origin.current;
    if (!card || !o || draggingRef.current) return;
    pressTimer.current = null;
    draggingRef.current = true;
    card.style.touchAction = 'none';
    try {
      if (isTouch.current) navigator.vibrate?.(15);
    } catch {
      /* ignore */
    }
    const rect = card.getBoundingClientRect();
    grabOffset.current = { dx: o.x - rect.left, dy: o.y - rect.top };
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-testid');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText =
      `position:fixed;left:0;top:0;width:${rect.width}px;margin:0;` +
      'pointer-events:none;z-index:100;opacity:0.95;' +
      'box-shadow:0 12px 32px rgb(16 24 40 / 0.16);transition:none;';
    document.body.appendChild(ghost);
    ghostEl.current = ghost;
    const pt = lastPt.current ?? o;
    moveGhost(pt.x, pt.y);
    setDragging(true);
    stopScrollLoop();
    raf.current = requestAnimationFrame(scrollLoop);
  }, [moveGhost, scrollLoop, stopScrollLoop]);

  const endDrag = useCallback(
    (commit: boolean): void => {
      const wasDragging = draggingRef.current;
      draggingRef.current = false;
      if (wasDragging && commit) {
        const pt = lastPt.current;
        const over = pt ? columnAt(pt.x, pt.y) : null;
        const { id, status } = stateRef.current;
        if (over && over !== status) moveTask(id, over);
      }
      if (wasDragging) {
        justDragged.current = true;
        window.setTimeout(() => {
          justDragged.current = false;
        }, 0);
      }
      cancelPress();
      stopScrollLoop();
      clearColumnGlow();
      removeGhost();
      if (cardEl.current) cardEl.current.style.touchAction = '';
      setDragging(false);
    },
    [cancelPress, moveTask, removeGhost, stopScrollLoop],
  );

  // Esc cancela; limpa timer/fantasma/loop ao desmontar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && draggingRef.current) endDrag(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelPress();
      stopScrollLoop();
      clearColumnGlow();
      removeGhost();
    };
  }, [cancelPress, endDrag, removeGhost, stopScrollLoop]);

  return {
    dragging,
    handlers: {
      onPointerDown: (e) => {
        if (!e.isPrimary || draggingRef.current) return;
        origin.current = { x: e.clientX, y: e.clientY };
        lastPt.current = { x: e.clientX, y: e.clientY };
        pointerId.current = e.pointerId;
        isTouch.current = e.pointerType !== 'mouse';
        cardEl.current = e.currentTarget;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* sem captura: gestos curtos continuam funcionando */
        }
        if (isTouch.current) {
          pressTimer.current = window.setTimeout(beginDrag, TOUCH_DELAY_MS);
        }
      },
      onPointerMove: (e) => {
        if (!e.isPrimary || e.pointerId !== pointerId.current) return;
        lastPt.current = { x: e.clientX, y: e.clientY };
        const o = origin.current;
        if (!o) return;
        if (!draggingRef.current) {
          const dist = Math.hypot(e.clientX - o.x, e.clientY - o.y);
          // Toque que andou antes do atraso = rolagem; mouse precisa do limiar.
          if (isTouch.current ? dist > TOUCH_TOLERANCE_PX : dist > MOUSE_THRESHOLD_PX) {
            if (isTouch.current) {
              cancelPress();
              return;
            }
            beginDrag();
            return;
          }
          return;
        }
        glowColumn(columnAt(e.clientX, e.clientY));
        moveGhost(e.clientX, e.clientY);
      },
      onPointerUp: () => {
        endDrag(true);
      },
      onPointerCancel: () => {
        endDrag(false);
      },
      onClickCapture: (e) => {
        if (justDragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}
