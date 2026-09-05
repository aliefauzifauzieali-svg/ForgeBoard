/**
 * Baixa um conteúdo JSON como arquivo no navegador.
 * Centraliza o ritual Blob → object URL → clique, usado em exportações e backups.
 */
export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Necessário no DOM em alguns navegadores para o download iniciar.
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nome de arquivo diário para backups, ex.: `forgeboard-backup-2026-09-05.json`. */
export function datedFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
}
