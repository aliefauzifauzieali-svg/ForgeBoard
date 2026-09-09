import type { Transaction } from '../types';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos → "R$ 1.234,56". Puro. */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100);
}

/**
 * Texto pt-BR ("1.234,56", "1234.56", "R$ 50") → centavos.
 * Retorna null quando inválido ou <= 0. Puro e testável.
 */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/R\$\s?/g, '').trim();
  if (cleaned === '') return null;
  let normalized = cleaned;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** Mês local "yyyy-MM" a partir de Date. Puro. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Desloca "yyyy-MM" por n meses. Puro. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

/** "2026-09" → "setembro de 2026". Puro. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const name = new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export interface MonthBalance {
  income: number;
  expense: number;
  balance: number;
}

/** Soma receitas/despesas das transações (em centavos). Puro. */
export function monthBalance(list: Transaction[]): MonthBalance {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.kind === 'income') income += t.amountCents;
    else expense += t.amountCents;
  }
  return { income, expense, balance: income - expense };
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  count: number;
}

/** Total por categoria, ordem decrescente. Puro. */
export function totalsByCategory(list: Transaction[]): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of list) {
    const e = map.get(t.categoryId) ?? { total: 0, count: 0 };
    e.total += t.amountCents;
    e.count += 1;
    map.set(t.categoryId, e);
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.total - a.total);
}

/** Filtra por mês (prefixo yyyy-MM), tipo e categoria. Puro. */
export function filterTransactions(
  all: Transaction[],
  month: string,
  kind: 'all' | 'income' | 'expense',
  categoryId: string | 'all',
): Transaction[] {
  return all
    .filter(
      (t) =>
        t.date.startsWith(month) &&
        (kind === 'all' || t.kind === kind) &&
        (categoryId === 'all' || t.categoryId === categoryId),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
