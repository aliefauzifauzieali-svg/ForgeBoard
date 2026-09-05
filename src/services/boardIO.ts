import { useBoardStore } from '../stores/useBoardStore';
import { useUIStore } from '../stores/useUIStore';
import { migrateToCurrent, MigrationError } from '../storage/migrations';
import type { BoardData } from '../types';
import { FORMAT_VERSION } from '../types';
import { datedFilename, downloadJson } from './download';
import { serializeBoard } from './validation';

/**
 * Exporta o board atual em JSON com toast de confirmação.
 * Usado pela sidebar e pela paleta de comandos.
 */
export function exportBoardNow(): void {
  const { projects, tasks, tags } = useBoardStore.getState();
  downloadJson(
    datedFilename('forgeboard'),
    serializeBoard({ version: FORMAT_VERSION, projects, tasks, tags }),
  );
  try {
    useUIStore.getState().pushToast({ kind: 'success', message: 'Dados exportados em JSON' });
  } catch {
    /* ignore */
  }
}

export interface ImportResult {
  ok: boolean;
  errors: string[];
  data: BoardData | null;
  /** true quando o arquivo era legado e foi migrado. */
  migrated: boolean;
}

/**
 * Valida um arquivo importado (qualquer versão conhecida), migrando para o
 * formato vigente. Nunca lança e nunca toca no estado atual.
 */
export function parseImport(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['Arquivo inválido: JSON malformado'], data: null, migrated: false };
  }
  const version =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { version?: unknown }).version
      : undefined;
  try {
    const data = migrateToCurrent(parsed);
    return { ok: true, errors: [], data, migrated: version !== FORMAT_VERSION };
  } catch (err) {
    const message = err instanceof MigrationError ? err.message : 'Arquivo inválido';
    return { ok: false, errors: [message], data: null, migrated: false };
  }
}
