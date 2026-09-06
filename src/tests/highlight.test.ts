import { describe, expect, it } from 'vitest';
import { highlightParts } from '../features/palette/highlight';

describe('highlightParts', () => {
  it('destaca ocorrência simples preservando o original', () => {
    expect(highlightParts('Corrigir bug do login', 'bug')).toEqual([
      { text: 'Corrigir ', hit: false },
      { text: 'bug', hit: true },
      { text: ' do login', hit: false },
    ]);
  });

  it('ignora maiúsculas, acentos e `#`', () => {
    expect(highlightParts('Página de conteúdo', 'PAGINA #conteudo')).toEqual([
      { text: 'Página', hit: true },
      { text: ' de ', hit: false },
      { text: 'conteúdo', hit: true },
    ]);
  });

  it('vários tokens e múltiplas ocorrências', () => {
    const parts = highlightParts('a b a', 'a b');
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['a', 'b', 'a']);
  });

  it('sem tokens ou sem ocorrência retorna trecho único', () => {
    expect(highlightParts('texto', '   ')).toEqual([{ text: 'texto', hit: false }]);
    expect(highlightParts('texto', 'zzz')).toEqual([{ text: 'texto', hit: false }]);
    expect(highlightParts('', 'a')).toEqual([{ text: '', hit: false }]);
  });
});
