import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  // Fecha na hora (lógica/foco), desmonta depois (animação de saída).
  const { rendered, leaving } = useDelayedUnmount(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    // Foca o primeiro campo ao abrir
    const t = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-close])',
      );
      el?.focus();
    }, 30);
    return () => {
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [open ]);

  // Trava a rolagem enquanto o diálogo está montado (inclui a saída).
  useEffect(() => {
    if (!rendered) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [rendered ]);

  // Mantém o Tab circulando dentro do diálogo enquanto visível.
  useFocusTrap(panelRef, rendered);

  if (!rendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-md sm:items-center sm:p-6 ${
        leaving ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-pop dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-2xl ${
          leaving ? 'animate-fade-out-scale' : 'animate-pop-in'
        } ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Fechar diálogo (Esc)"
            className="icon-btn shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
