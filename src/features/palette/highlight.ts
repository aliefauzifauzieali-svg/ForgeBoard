// Diacríticos combinantes (por escape: nada de invisível no fonte).
const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');

/** Normaliza (minúsculas, sem acentos) mapeando cada posição ao índice original. */
function normWithMap(s: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    for (const ch of s[i]!.normalize('NFD').toLowerCase()) {
      if (COMBINING.test(ch)) continue;
      norm += ch;
      map.push(i);
    }
  }
  return { norm, map };
}

export interface HiPart {
  text: string;
  hit: boolean;
}

/**
 * Divide `text` em trechos normal/destaque para os tokens da query
 * (insensível a maiúsculas/acentos; `#` inicial ignorado). Sem tokens ou
 * sem ocorrência: trecho único sem destaque.
 */
export function highlightParts(text: string, query: string): HiPart[] {
  const toks = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => (t.startsWith('#') ? t.slice(1) : t))
    .filter(Boolean);
  if (toks.length === 0 || text === '') return [{ text, hit: false }];
  const { norm, map } = normWithMap(text);
  const hits: boolean[] = new Array(text.length).fill(false);
  let any = false;
  // Tokens longos primeiro para não fragmentar o destaque.
  for (const tok of [...toks].sort((a, b) => b.length - a.length)) {
    const nTok = tok.normalize('NFD').toLowerCase().replace(COMBINING, '');
    if (!nTok) continue;
    let from = 0;
    for (;;) {
      const at = norm.indexOf(nTok, from);
      if (at === -1) break;
      for (let k = at; k < at + nTok.length; k++) {
        hits[map[k]!] = true;
      }
      any = true;
      from = at + nTok.length;
    }
  }
  if (!any) return [{ text, hit: false }];
  const parts: HiPart[] = [];
  let cur = '';
  let curHit = hits[0]!;
  for (let i = 0; i < text.length; i++) {
    if (hits[i] !== curHit) {
      parts.push({ text: cur, hit: curHit });
      cur = '';
      curHit = hits[i]!;
    }
    cur += text[i];
  }
  parts.push({ text: cur, hit: curHit });
  return parts.filter((p) => p.text !== '');
}
