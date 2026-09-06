import { useUIStore } from '../stores/useUIStore';
import { migrateToCurrent, MigrationError } from '../storage/migrations';
import type { BoardData } from '../types';
import { FORMAT_VERSION } from '../types';
import { datedFilename, downloadFile, downloadJson } from './download';
import { boardToMarkdown, tasksToCsv } from './exportFormats';
import { serializeBoard } from './validation';

export type ExportFormat = 'json' | 'csv' | 'md';

const FORMAT_LABEL: Record<ExportFormat, string> = {
  json: 'JSON',
  csv: 'CSV',
  md: 'Markdown',
};

/**
 * Exporta o board no formato escolhido, com toast de confirmação.
 * Recebe os dados por parâmetro (sem ler stores: inversão removida).
 * Usado pela sidebar e pela paleta de comandos.
 */
export function exportBoardNow(board: BoardData, format: ExportFormat = 'json'): void {
  const data = { version: FORMAT_VERSION, projects: board.projects, tasks: board.tasks, tags: board.tags };
  if (format === 'csv') {
    downloadFile(datedFilename('forgeboard', 'csv'), tasksToCsv(data), 'text/csv;charset=utf-8');
  } else if (format === 'md') {
    downloadFile(datedFilename('forgeboard', 'md'), boardToMarkdown(data), 'text/markdown;charset=utf-8');
  } else {
    downloadJson(datedFilename('forgeboard'), serializeBoard(data));
  }
  try {
    useUIStore.getState().pushToast({ kind: 'success', message: `Dados exportados em ${FORMAT_LABEL[format]}` });
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
