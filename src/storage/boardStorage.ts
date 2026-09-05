import { validateBoardData } from '../services/validation';
import type { BoardData } from '../types';
import { QUARANTINE_KEY, STORAGE_KEY } from '../utils/constants';
import { localStorageProvider } from './localStorageProvider';
import type { StorageProvider } from './StorageProvider';

export const EMPTY_BOARD: BoardData = { version: 1, projects: [], tasks: [] };

function quarantine(provider: StorageProvider, raw: string): void {
  try {
    provider.writeKey(QUARANTINE_KEY, raw);
  } catch {
    /* se nem a quarentena couber, não há o que fazer */
  }
}

/**
 * Carrega o board validando cada item com as mesmas regras da importação.
 * Payload ausente, malformado ou inválido resulta em board vazio — e o
 * conteúdo bruto é preservado na quarentena para recuperação manual.
 */
export function loadBoard(provider: StorageProvider = localStorageProvider): BoardData {
  let raw: string | null;
  try {
    raw = provider.readKey(STORAGE_KEY);
  } catch {
    return structuredClone(EMPTY_BOARD);
  }
  if (!raw) return structuredClone(EMPTY_BOARD);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(provider, raw);
    return structuredClone(EMPTY_BOARD);
  }

  const result = validateBoardData(parsed);
  if (result.ok && result.data) return result.data;
  quarantine(provider, raw);
  return structuredClone(EMPTY_BOARD);
}

export function saveBoard(data: BoardData, provider: StorageProvider = localStorageProvider): void {
  // Pode lançar QuotaExceededError — o store trata e avisa o usuário.
  provider.writeKey(STORAGE_KEY, JSON.stringify(data));
}

export function clearBoard(provider: StorageProvider = localStorageProvider): void {
  try {
    provider.removeKey(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Conteúdo bruto preservado por `loadBoard` quando os dados estavam inválidos. */
export function readQuarantine(provider: StorageProvider = localStorageProvider): string | null {
  try {
    return provider.readKey(QUARANTINE_KEY);
  } catch {
    return null;
  }
}

export function clearQuarantine(provider: StorageProvider = localStorageProvider): void {
  try {
    provider.removeKey(QUARANTINE_KEY);
  } catch {
    /* ignore */
  }
}
