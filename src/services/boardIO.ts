import { useBoardStore } from '../stores/useBoardStore';
import { useUIStore } from '../stores/useUIStore';
import { datedFilename, downloadJson } from './download';
import { serializeBoard } from './validation';

/**
 * Exporta o board atual em JSON com toast de confirmação.
 * Usado pela sidebar e pela paleta de comandos.
 */
export function exportBoardNow(): void {
  const { projects, tasks } = useBoardStore.getState();
  downloadJson(datedFilename('forgeboard'), serializeBoard({ version: 1, projects, tasks }));
  try {
    useUIStore.getState().pushToast({ kind: 'success', message: 'Dados exportados em JSON' });
  } catch {
    /* ignore */
  }
}
