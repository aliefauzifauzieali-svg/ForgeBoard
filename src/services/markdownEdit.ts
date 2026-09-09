import type { Note } from '../types';

export interface EditResult {
  value: string;
  selStart: number;
  selEnd: number;
}

/**
 * Envolve a seleção com `before`/`after` (ou insere placeholder).
 * Puro e testável (o componente só reposiciona o caret).
 */
export function surroundEdit(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = 'texto',
): EditResult {
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  const selStart = start + before.length;
  return { value: next, selStart, selEnd: selStart + selected.length };
}

/**
 * Alterna prefixo de linha (H1–H3, lista, quote, task, numerada):
 * aplica se ausente, remove se presente. Opera na linha do cursor. Puro.
 */
export function togglePrefixEdit(value: string, cursor: number, prefix: string): EditResult {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const line = value.slice(lineStart);
  if (line.startsWith(prefix)) {
    const next = value.slice(0, lineStart) + value.slice(lineStart + prefix.length);
    const pos = Math.max(lineStart, cursor - prefix.length);
    return { value: next, selStart: pos, selEnd: pos };
  }
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  const pos = cursor + prefix.length;
  return { value: next, selStart: pos, selEnd: pos };
}

/** Insere modelo de tabela GFM na posição do cursor. Puro. */
export function insertTableEdit(value: string, cursor: number): EditResult {
  const template = '\n\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n|  |  |\n';
  const next = value.slice(0, cursor) + template + value.slice(cursor);
  const pos = cursor + template.length;
  return { value: next, selStart: pos, selEnd: pos };
}

/** Insere `[texto](url)` com a URL selecionada para digitar. Puro. */
export function insertLinkEdit(value: string, start: number, end: number): EditResult {
  const text = value.slice(start, end) || 'texto';
  const next = `${value.slice(0, start)}[${text}](url)${value.slice(end)}`;
  const urlStart = start + text.length + 3;
  return { value: next, selStart: urlStart, selEnd: urlStart + 3 };
}

/** Insere `![alt](url)` com a URL selecionada. Puro. */
export function insertImageEdit(value: string, cursor: number): EditResult {
  const snippet = '![descrição](url)';
  const next = value.slice(0, cursor) + snippet + value.slice(cursor);
  const urlStart = cursor + '![descrição]('.length;
  return { value: next, selStart: urlStart, selEnd: urlStart + 3 };
}

/** Insere bloco de código cercado. Puro. */
export function insertCodeBlockEdit(value: string, start: number, end: number): EditResult {
  const selected = value.slice(start, end) || 'código';
  const next = `${value.slice(0, start)}\n\`\`\`\n${selected}\n\`\`\`\n${value.slice(end)}`;
  const selStart = start + 5;
  return { value: next, selStart, selEnd: selStart + selected.length };
}

/** Palavras (sequências \S+). Puro. */
export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Minutos de leitura (200 ppm, mínimo 1 quando há texto). Puro. */
export function readingMinutes(words: number): number {
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

/** Excerto plano p/ a lista (remove marcações comuns). Puro. */
export function noteExcerpt(content: string, max = 120): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`~\-[\]()|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trimEnd()}…`;
}

export interface NoteFilter {
  q: string;
  folder: string;
  showArchived: boolean;
}

/**
 * Busca (título/conteúdo/tags/pasta) + filtro de pasta + arquivadas.
 * Ordena: fixadas primeiro, depois atualização desc. Puro e testável.
 */
export function filterNotes(notes: Note[], filter: NoteFilter): Note[] {
  const q = filter.q.trim().toLowerCase();
  return notes
    .filter((n) => (filter.showArchived ? n.archived : !n.archived))
    .filter((n) => filter.folder === '' || n.folder === filter.folder)
    .filter(
      (n) =>
        q === '' ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.folder.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}
