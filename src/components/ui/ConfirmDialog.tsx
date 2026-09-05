import { AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { Modal } from './Modal';

export function ConfirmDialog(): React.JSX.Element {
  const confirm = useUIStore((s) => s.confirm);
  const closeConfirm = useUIStore((s) => s.closeConfirm);

  return (
    <Modal
      open={confirm.open}
      title={confirm.title || 'Confirmar ação'}
      description={confirm.description}
      onClose={closeConfirm}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"
        >
          <AlertTriangle size={20} />
        </span>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Esta ação não pode ser desfeita. Deseja continuar?
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" autoFocus className="btn-ghost" onClick={closeConfirm}>
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          onClick={() => {
            confirm.action?.();
            closeConfirm();
          }}
        >
          {confirm.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
