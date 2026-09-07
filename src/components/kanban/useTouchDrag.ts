import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 12;
const EDGE_PX = 64;
const SCROLL_STEP = 14;

type Status = Task['status'];

function columnStatusAt(x: number, y: number): Status | null {
  // O card arrastado segue o dedo (translate) e fica sob o ponto: pula ele
  // e qualquer outro nó interno para achar a coluna de destino de verdade.
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  for (const el of stack) {
    if (el instanceof HTMLElement && el.closest('[data-touch-dragging]')) continue;
    const col = el instanceof HTMLElement ? el.closest('[data-column]') : null;
    const value = (col as HTMLElement | null)?.dataset.column;
    if (value === 'backlog' || value === 'in-progress' || value === 'done') return value;
  }
  return null;
}

function glowColumn(status: Status | null): void {
  document.querySelectorAll('[data-column].touch-drop-target').forEach((el) => {
    if ((el as HTMLElement).dataset.column !== status) el.classList.remove('touch-drop-target');
  });
  if (status) {
    document
      .querySelector(`[data-column="${status}"]`)
      ?.classList.add('touch-drop-target');
  }
}

function clearColumnGlow(): void {
  document
    .querySelectorAll('[data-column].touch-drop-target')
    .forEach((el) => el.classList.remove('touch-drop-target'));
}

/**
 * Arrastar por toque (long-press): HTML5 DnD não existe no touch, então
 * Pointer Events assumem — só para `pointerType === 'touch'`; mouse usa o
 * DnD nativo. Inclui autoscroll e Esc para cancelar. Botões seguem como
 * fallback (não removidos).
 */
export function useTouchDrag(task: Task): {
  dragging: boolean;
  dragStyle: CSSProperties | undefined;
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
  };
} {
  const moveTask = useBoardStore((s) => s.moveTask);
  const [dragPos, setDragPos] = useState<{ dx: number; dy: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const justDragged = useRef(false);
  const raf = useRef(0);
  const cardEl = useRef<HTMLElement | null>(null);
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
  }, []);

  const endDrag = useCallback(
    (commit: boolean): void => {
      // Ordem importa: resolve o destino ANTES de remover o marcador
      // `data-touch-dragging` — o card traduzido ainda está sob o dedo e
      // precisa ser ignorado pelo hit-test (senão o drop cai na origem).
      if (draggingRef.current) {
        draggingRef.current = false;
        if (commit) {
          const pt = lastPt.current;
          const over = pt ? columnStatusAt(pt.x, pt.y) : null;
          const { id, status } = stateRef.current;
          if (over && over !== status) moveTask(id, over);
        }
        justDragged.current = true;
        window.setTimeout(() => {
          justDragged.current = false;
        }, 0);
      }
      cancelPress();
      stopScrollLoop();
      clearColumnGlow();
      if (cardEl.current) {
        cardEl.current.style.touchAction = '';
        delete cardEl.current.dataset.touchDragging;
      }
      setDragPos(null);
    },
    [cancelPress, moveTask, stopScrollLoop],
  );

  // Esc cancela; limpa timer/loop ao desmontar.
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
    };
  }, [cancelPress, endDrag, stopScrollLoop]);

  return {
    dragging: dragPos !== null,
    dragStyle: dragPos
      ? {
          transform: `translate(${dragPos.dx}px, ${dragPos.dy}px) scale(1.03)`,
          transitionProperty: 'none',
          zIndex: 50,
          position: 'relative',
          opacity: 0.92,
          boxShadow: '0 12px 32px rgb(16 24 40 / 0.16)',
        }
      : undefined,
    handlers: {
      onPointerDown: (e) => {
        if (e.pointerType !== 'touch' || !e.isPrimary) return;
        origin.current = { x: e.clientX, y: e.clientY };
        lastPt.current = { x: e.clientX, y: e.clientY };
        cardEl.current = e.currentTarget;
        pressTimer.current = window.setTimeout(() => {
          pressTimer.current = null;
          draggingRef.current = true;
          if (cardEl.current) {
            cardEl.current.style.touchAction = 'none';
            cardEl.current.dataset.touchDragging = 'true';
          }
          try {
            navigator.vibrate?.(15);
          } catch {
            /* ignore */
          }
          setDragPos({ dx: 0, dy: 0 });
          stopScrollLoop();
          raf.current = requestAnimationFrame(scrollLoop);
        }, LONG_PRESS_MS);
      },
      onPointerMove: (e) => {
        if (e.pointerType !== 'touch' || !e.isPrimary) return;
        lastPt.current = { x: e.clientX, y: e.clientY };
        const o = origin.current;
        if (!o) return;
        if (!draggingRef.current) {
          // Moveu antes do long-press: era rolagem, não drag.
          if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE_PX) cancelPress();
          return;
        }
        glowColumn(columnStatusAt(e.clientX, e.clientY));
        setDragPos({ dx: e.clientX - o.x, dy: e.clientY - o.y });
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
