import { useState } from 'react';
import { AlertTriangle, Database, Download, RotateCcw, X } from 'lucide-react';
import { clearQuarantine, readQuarantine } from '../../storage/boardStorage';
import { datedFilename, downloadJson } from '../../services/download';
import { serializeBoard } from '../../services/validation';
import { FORMAT_VERSION } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';

/**
 * Banner exibido quando o boot encontrou dados inválidos e os preservou
 * na quarentena. Permite baixar a cópia bruta, restaurar o último backup,
 * recomeçar do zero ou descartar a cópia.
 */
export function QuarantineBanner(): React.JSX.Element | null {
  const [raw, setRaw] = useState<string | null>(() => readQuarantine());
  const backups = useBoardStore((s) => s.backups);
  const restoreBackup = useBoardStore((s) => s.restoreBackup);
  const resetAll = useBoardStore((s) => s.resetAll);
  const askConfirm = useUIStore((s) => s.askConfirm);
  if (!raw) return null;

  const download = (): void => {
    downloadJson(datedFilename('forgeboard-recuperacao'), raw);
  };

  const discard = (): void => {
    clearQuarantine();
    setRaw(null);
  };

  const latest = backups[0];

  return (
    <div
      role="alert"
      data-testid="quarantine-banner"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <AlertTriangle size={18} aria-hidden className="shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 text-amber-900 dark:text-amber-200">
        <strong>Encontramos dados inválidos salvos anteriormente.</strong> Começamos com um quadro
        vazio e guardamos uma cópia de recuperação.
      </p>
      <span className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={download}>
          <Download size={14} aria-hidden /> Baixar cópia
        </button>
        {latest ? (
          <button
            type="button"
            className="btn-ghost !py-1.5 text-xs"
            onClick={() =>
              askConfirm({
                title: 'Restaurar backup',
                description: 'Os dados atuais (vazios) serão substituídos pelo último backup.',
                confirmLabel: 'Restaurar',
                action: () => {
                  restoreBackup(latest.id);
                  discard();
                },
              })
            }
          >
            <RotateCcw size={14} aria-hidden /> Restaurar backup
          </button>
        ) : null}
        <button
          type="button"
          className="btn-ghost !py-1.5 text-xs"
          onClick={() =>
            askConfirm({
              title: 'Recomeçar do zero',
              description: 'Apaga a cópia de recuperação e confirma o quadro vazio.',
              confirmLabel: 'Apagar tudo',
              action: () => {
                resetAll();
                discard();
              },
            })
          }
        >
          <X size={14} aria-hidden /> Recomeçar
        </button>
        <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={discard}>
          <X size={14} aria-hidden /> Descartar
        </button>
      </span>
    </div>
  );
}

/** Aviso visível quando a persistência no navegador falha (ex.: cota excedida). */
export function StorageErrorBanner(): React.JSX.Element | null {
  const saveError = useBoardStore((s) => s.saveError);
  const dismissSaveError = useBoardStore((s) => s.dismissSaveError);
  const projects = useBoardStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const tags = useBoardStore((s) => s.tags);
  if (!saveError) return null;

  const download = (): void => {
    downloadJson(
      datedFilename('forgeboard-backup'),
      serializeBoard({ version: FORMAT_VERSION, projects, tasks, tags }),
    );
  };

  return (
    <div
      role="alert"
      data-testid="storage-error-banner"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm dark:border-red-500/30 dark:bg-red-500/10"
    >
      <Database size={18} aria-hidden className="shrink-0 text-red-600 dark:text-red-400" />
      <p className="min-w-0 flex-1 text-red-900 dark:text-red-200">{saveError}</p>
      <span className="flex gap-2">
        <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={download}>
          <Download size={14} aria-hidden /> Exportar backup
        </button>
        <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={dismissSaveError}>
          <X size={14} aria-hidden /> Dispensar
        </button>
      </span>
    </div>
  );
}
