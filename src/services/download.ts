/**
 * Baixa um conteúdo de texto como arquivo no navegador.
 * Centraliza o ritual Blob → object URL → clique, usado em exportações e backups.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
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

/** Baixa um conteúdo JSON como arquivo no navegador. */
export function downloadJson(filename: string, content: string): void {
  downloadFile(filename, content, 'application/json');
}

/** Nome de arquivo diário, ex.: `forgeboard-2026-09-05.json`. */
export function datedFilename(prefix: string, ext = 'json'): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
