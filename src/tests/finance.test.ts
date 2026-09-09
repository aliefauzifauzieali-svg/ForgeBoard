import { beforeEach, describe, expect, it } from 'vitest';
import {
  filterTransactions,
  formatBRL,
  monthBalance,
  monthKey,
  parseAmountToCents,
  shiftMonth,
  totalsByCategory,
} from '../services/finance';
import { OUTROS_CATEGORY_ID, useFinanceStore } from '../stores/useFinanceStore';
import type { Transaction } from '../types';

function resetFinance(): void {
  useFinanceStore.setState({ transactions: [], categories: [], goals: [], hydrated: false });
}

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    kind: 'expense',
    amountCents: 1000,
    categoryId: 'alimentacao',
    description: 'X',
    date: '2026-09-08',
    projectId: null,
    goalId: null,
    createdAt: '2026-09-08T10:00:00.000Z',
    ...over,
  };
}

describe('parseAmountToCents', () => {
  it('aceita formatos pt-BR', () => {
    expect(parseAmountToCents('49,90')).toBe(4990);
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('R$ 50')).toBe(5000);
    expect(parseAmountToCents('10.5')).toBe(1050);
  });

  it('rejeita inválidos e não-positivos', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('0')).toBeNull();
    expect(parseAmountToCents('0,00')).toBeNull();
    expect(parseAmountToCents('-5')).toBeNull();
    expect(parseAmountToCents('1,234')).toBeNull();
  });
});

describe('mês e agregações', () => {
  it('monthKey/shiftMonth navegam', () => {
    expect(monthKey(new Date(2026, 8, 15))).toBe('2026-09');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('monthBalance soma por tipo', () => {
    const b = monthBalance([tx(), tx({ kind: 'income', amountCents: 5000 })]);
    expect(b).toEqual({ income: 5000, expense: 1000, balance: 4000 });
  });

  it('totalsByCategory ordena desc', () => {
    const totals = totalsByCategory([
      tx({ categoryId: 'a', amountCents: 100 }),
      tx({ categoryId: 'b', amountCents: 300 }),
      tx({ categoryId: 'a', amountCents: 50 }),
    ]);
    expect(totals).toEqual([
      { categoryId: 'b', total: 300, count: 1 },
      { categoryId: 'a', total: 150, count: 2 },
    ]);
  });

  it('filterTransactions por mês/tipo/categoria', () => {
    const all = [
      tx({ id: '1', date: '2026-09-01' }),
      tx({ id: '2', date: '2026-09-02', kind: 'income' }),
      tx({ id: '3', date: '2026-08-30' }),
    ];
    expect(filterTransactions(all, '2026-09', 'all', 'all').map((t) => t.id)).toEqual(['2', '1']);
    expect(filterTransactions(all, '2026-09', 'income', 'all').map((t) => t.id)).toEqual(['2']);
    expect(filterTransactions(all, '2026-09', 'all', 'outra')).toEqual([]);
  });

  it('formatBRL formata pt-BR', () => {
    expect(formatBRL(4990)).toContain('49,90');
  });
});

describe('useFinanceStore', () => {
  beforeEach(async () => {
    resetFinance();
    // Isola do IndexedDB (persists async dos testes vizinhos).
    const { setKV } = await import('../storage/idb');
    await setKV('finance-data', { transactions: [], categories: [], goals: [] });
  });

  it('hidrata com categorias padrão', async () => {
    await useFinanceStore.getState().hydrate();
    const names = useFinanceStore.getState().categories.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Alimentação', 'Salário', 'Outros']));
    expect(useFinanceStore.getState().categories.find((c) => c.id === OUTROS_CATEGORY_ID)?.builtin).toBe(true);
  });

  it('CRUD de transações', async () => {
    await useFinanceStore.getState().hydrate();
    const t = useFinanceStore.getState().createTransaction({
      kind: 'expense',
      amountCents: 2500,
      categoryId: 'alimentacao',
      description: '  Mercado  ',
      date: '2026-09-08',
      projectId: null,
      goalId: null,
    });
    expect(t.description).toBe('Mercado');
    useFinanceStore.getState().updateTransaction(t.id, { amountCents: 3000 });
    expect(useFinanceStore.getState().transactions[0]?.amountCents).toBe(3000);
    useFinanceStore.getState().deleteTransaction(t.id);
    expect(useFinanceStore.getState().transactions).toHaveLength(0);
  });

  it('meta atualiza sozinha ao vincular transações', async () => {
    await useFinanceStore.getState().hydrate();
    const s = useFinanceStore.getState();
    const goal = s.createGoal({ name: 'Reserva', targetCents: 10000, deadline: null });

    const dep = useFinanceStore.getState().createTransaction({
      kind: 'income', amountCents: 3000, categoryId: 'salario',
      description: 'Aporte', date: '2026-09-08', projectId: null, goalId: goal.id,
    });
    expect(useFinanceStore.getState().goals[0]?.currentCents).toBe(3000);

    // Despesa vinculada subtrai (trava em zero).
    useFinanceStore.getState().createTransaction({
      kind: 'expense', amountCents: 5000, categoryId: 'lazer',
      description: 'Resgate', date: '2026-09-08', projectId: null, goalId: goal.id,
    });
    expect(useFinanceStore.getState().goals[0]?.currentCents).toBe(0);

    // Excluir a receita original não deve negativar.
    useFinanceStore.getState().deleteTransaction(dep.id);
    expect(useFinanceStore.getState().goals[0]?.currentCents).toBe(0);

    // Editar valor ajusta pelo delta.
    const dep2 = useFinanceStore.getState().createTransaction({
      kind: 'income', amountCents: 1000, categoryId: 'salario',
      description: 'A', date: '2026-09-08', projectId: null, goalId: goal.id,
    });
    useFinanceStore.getState().updateTransaction(dep2.id, { amountCents: 2500 });
    expect(useFinanceStore.getState().goals[0]?.currentCents).toBe(2500);
  });

  it('aporte manual e arquivar/excluir meta', async () => {
    await useFinanceStore.getState().hydrate();
    const goal = useFinanceStore.getState().createGoal({ name: 'Bike', targetCents: 2000, deadline: '2026-12-31' });
    useFinanceStore.getState().addToGoal(goal.id, 500);
    useFinanceStore.getState().addToGoal(goal.id, -800);
    expect(useFinanceStore.getState().goals[0]?.currentCents).toBe(0);

    const t = useFinanceStore.getState().createTransaction({
      kind: 'income', amountCents: 100, categoryId: 'salario',
      description: '', date: '2026-09-08', projectId: null, goalId: goal.id,
    });
    useFinanceStore.getState().deleteGoal(goal.id);
    expect(useFinanceStore.getState().goals).toHaveLength(0);
    // Transação permanece, desvinculada.
    expect(useFinanceStore.getState().transactions.find((x) => x.id === t.id)?.goalId).toBeNull();
  });

  it('categoria personalizada: criar, renomear, excluir remap p/ Outros', async () => {
    await useFinanceStore.getState().hydrate();
    const cat = useFinanceStore.getState().createCategory({ name: 'Pets', color: '#EC4899', kind: 'expense' });
    const t = useFinanceStore.getState().createTransaction({
      kind: 'expense', amountCents: 100, categoryId: cat.id,
      description: 'Ração', date: '2026-09-08', projectId: null, goalId: null,
    });
    useFinanceStore.getState().updateCategory(cat.id, { name: 'Animais' });
    expect(useFinanceStore.getState().categories.find((c) => c.id === cat.id)?.name).toBe('Animais');

    expect(useFinanceStore.getState().deleteCategory('salario')).toBe(false);
    expect(useFinanceStore.getState().deleteCategory(cat.id)).toBe(true);
    expect(useFinanceStore.getState().transactions.find((x) => x.id === t.id)?.categoryId).toBe(OUTROS_CATEGORY_ID);
  });

  it('persiste e ignora registros inválidos', async () => {
    await useFinanceStore.getState().hydrate();
    const t = useFinanceStore.getState().createTransaction({
      kind: 'expense', amountCents: 100, categoryId: 'alimentacao',
      description: 'P', date: '2026-09-08', projectId: null, goalId: null,
    });
    await new Promise((r) => setTimeout(r, 0));
    resetFinance();
    await useFinanceStore.getState().hydrate();
    expect(useFinanceStore.getState().transactions.map((x) => x.id)).toContain(t.id);

    const { setKV } = await import('../storage/idb');
    await setKV('finance-data', {
      transactions: [{ id: '', kind: 'x' }, null],
      categories: [],
      goals: [{ id: 'g', name: ' ', targetCents: -1 }],
    });
    resetFinance();
    await useFinanceStore.getState().hydrate();
    expect(useFinanceStore.getState().transactions).toEqual([]);
    expect(useFinanceStore.getState().goals).toEqual([]);
    // Sem categorias válidas → repovoa padrão.
    expect(useFinanceStore.getState().categories.length).toBeGreaterThan(0);
  });
});
