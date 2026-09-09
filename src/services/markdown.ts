import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renderiza Markdown em HTML sanitizado para preview (marked leve +
 * DOMPurify; sem `react-markdown` para não puxar a árvore mdast/unist).
 * Quebras de linha simples viram `<br>` (estilo Notion).
 */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src, { breaks: true, gfm: true });
  const raw = typeof html === 'string' ? html : '';
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
