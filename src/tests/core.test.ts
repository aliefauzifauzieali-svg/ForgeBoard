import { describe, expect, it } from 'vitest';
import { cn, generateId, nowIso, parseTags } from '../utils/core';

describe('cn', () => {
  it('concatena ignorando falsy', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    expect(cn()).toBe('');
  });
});

describe('generateId / nowIso', () => {
  it('gera ids únicos e ISO válido', () => {
    expect(generateId()).not.toBe(generateId());
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });
});

describe('parseTags', () => {
  it('normaliza, dedupica e limita', () => {
    expect(parseTags('Design, design ,URGENTE,, a  b')).toEqual(['design', 'urgente', 'a-b']);
    expect(parseTags('')).toEqual([]);
    expect(parseTags('a,b,c,d,e,f,g,h,i,j,k,l,m,n')).toHaveLength(12);
  });
});
