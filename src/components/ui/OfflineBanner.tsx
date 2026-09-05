import { WifiOff } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

/** Faixa discreta quando a rede cai — os dados continuam locais. */
export function OfflineBanner(): React.JSX.Element | null {
  const online = useUIStore((s) => s.online);
  if (online) return null;
  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <WifiOff size={15} aria-hidden />
      Você está offline — tudo continua funcionando e salvo neste dispositivo.
    </div>
  );
}
