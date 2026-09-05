import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/core';

/** Indicador de carregamento (operações assíncronas, ex.: importação). */
export function Spinner({ label, className }: { label: string; className?: string }): React.JSX.Element {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center', className)}>
      <Loader2 size={16} aria-hidden className="animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
