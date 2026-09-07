import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUIStore, type ToastItem } from '../../stores/useUIStore';
import { cn } from '../../utils/core';

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const STYLE = {
  success: 'border-emerald-200 dark:border-emerald-500/30',
  error: 'border-red-200 dark:border-red-500/30',
  info: 'border-zinc-200 dark:border-zinc-700',
} as const;

function ToastCard({ toast }: { toast: ToastItem }): React.JSX.Element {
  const dismissToast = useUIStore((s) => s.dismissToast);
  const Icon = ICON[toast.kind];

  useEffect(() => {
    const t = window.setTimeout(
      () => dismissToast(toast.id),
      toast.action ? 8000 : 5000,
    );
    return () => window.clearTimeout(t);
  }, [toast.id, toast.action, dismissToast]);

  return (
    <div
      role="status"
      data-testid={`toast-${toast.id}`}
      className={cn(
        'card animate-fade-up flex w-full items-center gap-2.5 !rounded-xl px-3.5 py-2.5 shadow-pop',
        STYLE[toast.kind],
      )}
    >
      <Icon
        size={18}
        aria-hidden
        className={cn(
          'shrink-0',
          toast.kind === 'success' && 'text-emerald-600 dark:text-emerald-400',
          toast.kind === 'error' && 'text-red-600 dark:text-red-400',
          toast.kind === 'info' && 'text-zinc-600 dark:text-zinc-400',
        )}
      />
      <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:text-[var(--accent-bright)]"
          onClick={() => {
            toast.action?.run();
            dismissToast(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dispensar notificação"
        className="icon-btn !h-7 !w-7 shrink-0"
        onClick={() => dismissToast(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Pilha de notificações — canto inferior direito, acima da navegação mobile. */
export function ToastStack(): React.JSX.Element {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div
      data-testid="toast-stack"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
