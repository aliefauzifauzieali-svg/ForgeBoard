import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { promptInstall } from '../../services/pwa';
import { useUIStore } from '../../stores/useUIStore';

/** Botão de instalação — visível só quando o navegador oferecer o PWA. */
export function InstallButton(): React.JSX.Element | null {
  const available = useUIStore((s) => s.installAvailable);
  const dismissed = useUIStore((s) => s.installDismissed);
  const dismissInstall = useUIStore((s) => s.dismissInstall);
  const [busy, setBusy] = useState(false);
  if (!available || dismissed) return null;

  const install = async (): Promise<void> => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="install-button"
      className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-2 pl-3 dark:border-[color-mix(in_srgb,var(--accent)_30%,transparent)] dark:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
    >
      <p className="min-w-0 flex-1 text-xs font-semibold">Instale o ForgeBoard</p>
      <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => void install()}>
        <Download size={14} aria-hidden /> Instalar
      </button>
      <button
        type="button"
        aria-label="Dispensar instalação"
        className="icon-btn !h-7 !w-7 shrink-0"
        onClick={dismissInstall}
      >
        <X size={14} />
      </button>
    </div>
  );
}
