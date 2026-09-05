import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

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
    // Trava rolagem do fundo
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open ]);

  // Mantém o Tab circulando dentro do diálogo (focus trap).
  useFocusTrap(panelRef, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-6"
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
        className={`animate-fade-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop dark:bg-zinc-900 sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
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
