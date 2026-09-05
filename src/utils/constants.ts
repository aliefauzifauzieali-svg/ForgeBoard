export const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#64748b', // slate
] as const;

export const STATUS_META = {
  backlog: { label: 'Backlog' },
  'in-progress': { label: 'Em andamento' },
  done: { label: 'Concluído' },
} as const;

export const PRIORITY_META = {
  low: { label: 'Baixa', rank: 0 },
  medium: { label: 'Média', rank: 1 },
  high: { label: 'Alta', rank: 2 },
  critical: { label: 'Crítica', rank: 3 },
} as const;

export const STORAGE_KEY = 'forgeboard:v1';
export const THEME_KEY = 'forgeboard:theme';
/** Chave onde payloads inválidos são preservados para recuperação manual. */
export const QUARANTINE_KEY = 'forgeboard:quarantine';
/** Tamanho máximo aceito na importação (evita travar a aba com arquivos gigantes). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
