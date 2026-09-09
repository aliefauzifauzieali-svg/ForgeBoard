import { create } from 'zustand';
import type { FinanceCategory, Goal, Transaction } from '../types';
import { generateId, nowIso } from '../utils/core';
import { getKV, setKV } from '../storage/idb';

const KV_FINANCE = 'finance-data';
export const OUTROS_CATEGORY_ID = 'outros';

function builtinCategories(): FinanceCategory[] {
  const expense = (id: string, name: string, color: string): FinanceCategory => ({ id, name, color, kind: 'expense', builtin: true });
  const income = (id: string, name: string, color: string): FinanceCategory => ({ id, name, color, kind: 'income', builtin: true });
  return [
    income('salario', 'Salário', '#22C55E'),
    income('freelance', 'Freelance', '#14B8A6'),
    expense('moradia', 'Moradia', '#6366F1'),
    expense('alimentacao', 'Alimentação', '#F59E0B'),
    expense('transporte', 'Transporte', '#0EA5E9'),
    expense('saude', 'Saúde', '#EF4444'),
    expense('educacao', 'Educação', '#8B5CF6'),
    expense('lazer', 'Lazer', '#EC4899'),
    { id: 'investimentos', name: 'Investimentos', color: '#10B981', kind: 'both', builtin: true },
    expense(OUTROS_CATEGORY_ID, 'Outros', '#71717A'),
  ];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeCategory(raw: unknown): FinanceCategory | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Partial<FinanceCategory>;
  if (typeof c.id !== 'string' || c.id === '' || typeof c.name !== 'string' || c.name.trim() === '') return null;
  if (typeof c.color !== 'string') return null;
  return {
    id: c.id,
    name: c.name.slice(0, 40),
    color: c.color,
    kind: c.kind === 'income' || c.kind === 'expense' || c.kind === 'both' ? c.kind : 'both',
    builtin: c.builtin === true,
  };
}

function sanitizeTransaction(raw: unknown): Transaction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const t = raw as Partial<Transaction>;
  if (typeof t.id !== 'string' || t.id === '') return null;
  if (t.kind !== 'income' && t.kind !== 'expense') return null;
  if (typeof t.amountCents !== 'number' || !Number.isFinite(t.amountCents) || t.amountCents < 0) return null;
  if (typeof t.date !== 'string' || !DATE_RE.test(t.date)) return null;
  if (typeof t.categoryId !== 'string') return null;
  if (typeof t.createdAt !== 'string') return null;
  return {
    id: t.id,
    kind: t.kind,
    amountCents: Math.round(t.amountCents),
    categoryId: t.categoryId,
    description: typeof t.description === 'string' ? t.description.slice(0, 120) : '',
    date: t.date,
    projectId: typeof t.projectId === 'string' ? t.projectId : null,
    goalId: typeof t.goalId === 'string' ? t.goalId : null,
    createdAt: t.createdAt,
  };
}

function sanitizeGoal(raw: unknown): Goal | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const g = raw as Partial<Goal>;
  if (typeof g.id !== 'string' || g.id === '' || typeof g.name !== 'string' || g.name.trim() === '') return null;
  if (typeof g.targetCents !== 'number' || !Number.isFinite(g.targetCents) || g.targetCents <= 0) return null;
  if (typeof g.createdAt !== 'string') return null;
  const current = typeof g.currentCents === 'number' && Number.isFinite(g.currentCents) ? Math.max(0, Math.round(g.currentCents)) : 0;
  return {
    id: g.id,
    name: g.name.slice(0, 80),
    targetCents: Math.round(g.targetCents),
    currentCents: current,
    deadline: typeof g.deadline === 'string' && DATE_RE.test(g.deadline) ? g.deadline : null,
    createdAt: g.createdAt,
    archived: g.archived === true,
  };
}

interface FinanceData {
  transactions: Transaction[];
  categories: FinanceCategory[];
  goals: Goal[];
}

function persist(data: FinanceData): void {
  void setKV(KV_FINANCE, data satisfies FinanceData).catch(() => {});
}

/** Efeito assinado de uma transação sobre a meta (receita soma, despesa subtrai). */
function signedDelta(t: Pick<Transaction, 'kind' | 'amountCents'>): number {
  return t.kind === 'income' ? t.amountCents : -t.amountCents;
}

export interface TransactionInput {
  kind: 'income' | 'expense';
  amountCents: number;
  categoryId: string;
  description: string;
  date: string;
  projectId: string | null;
  goalId: string | null;
}

interface FinanceState extends FinanceData {
  hydrated: boolean;
  hydrate: () => Promise<void>;

  createTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, patch: Partial<TransactionInput>) => void;
  deleteTransaction: (id: string) => void;

  createCategory: (input: { name: string; color: string; kind: FinanceCategory['kind'] }) => FinanceCategory;
  updateCategory: (id: string, patch: Partial<Pick<FinanceCategory, 'name' | 'color' | 'kind'>>) => void;
  /** Exclui personalizada e remap suas transações p/ "Outros". Nativas: false. */
  deleteCategory: (id: string) => boolean;

  createGoal: (input: { name: string; targetCents: number; deadline: string | null }) => Goal;
  updateGoal: (id: string, patch: Partial<Pick<Goal, 'name' | 'targetCents' | 'deadline'>>) => void;
  /** Aporte manual (positivo ou negativo; trava em zero). */
  addToGoal: (id: string, deltaCents: number) => void;
  archiveGoal: (id: string, archived: boolean) => void;
  /** Exclui a meta e desvincula suas transações (elas permanecem). */
  deleteGoal: (id: string) => void;
}

/** Finanças pessoais (Fase 18.3): transações, categorias e metas em `kv.finance-data`. */
export const useFinanceStore = create<FinanceState>()((set, get) => {
  function applyGoalDelta(goals: Goal[], goalId: string | null, delta: number): Goal[] {
    if (goalId === null || delta === 0) return goals;
    return goals.map((g) => (g.id === goalId ? { ...g, currentCents: Math.max(0, g.currentCents + delta) } : g));
  }

  return {
    transactions: [],
    categories: [],
    goals: [],
    hydrated: false,

    hydrate: async () => {
      if (get().hydrated) return;
      try {
        const raw = await getKV<unknown>(KV_FINANCE);
        if (typeof raw === 'object' && raw !== null) {
          const data = raw as Partial<FinanceData>;
          const categories = Array.isArray(data.categories)
            ? data.categories.map(sanitizeCategory).filter((c): c is FinanceCategory => c !== null)
            : [];
          const known = new Set(categories.map((c) => c.id));
          const transactions = Array.isArray(data.transactions)
            ? data.transactions
                .map(sanitizeTransaction)
                .filter((t): t is Transaction => t !== null)
                .map((t) => (known.has(t.categoryId) ? t : { ...t, categoryId: OUTROS_CATEGORY_ID }))
            : [];
          const goals = Array.isArray(data.goals)
            ? data.goals.map(sanitizeGoal).filter((g): g is Goal => g !== null)
            : [];
          const goalIds = new Set(goals.map((g) => g.id));
          set({
            transactions: transactions.map((t) => (t.goalId && !goalIds.has(t.goalId) ? { ...t, goalId: null } : t)),
            categories: categories.length > 0 ? categories : builtinCategories(),
            goals,
            hydrated: true,
          });
          return;
        }
      } catch {
        /* ignore */
      }
      set({ categories: builtinCategories(), hydrated: true });
    },

    createTransaction: (input) => {
      const tx: Transaction = {
        id: generateId(),
        kind: input.kind,
        amountCents: Math.max(0, Math.round(input.amountCents)),
        categoryId: input.categoryId,
        description: input.description.trim().slice(0, 120),
        date: input.date,
        projectId: input.projectId,
        goalId: input.goalId,
        createdAt: nowIso(),
      };
      const transactions = [tx, ...get().transactions];
      const goals = applyGoalDelta(get().goals, tx.goalId, signedDelta(tx));
      set({ transactions, goals });
      persist({ transactions, categories: get().categories, goals });
      return tx;
    },

    updateTransaction: (id, patch) => {
      const prev = get().transactions.find((t) => t.id === id);
      if (!prev) return;
      const next: Transaction = {
        ...prev,
        kind: patch.kind ?? prev.kind,
        amountCents: patch.amountCents !== undefined ? Math.max(0, Math.round(patch.amountCents)) : prev.amountCents,
        categoryId: patch.categoryId ?? prev.categoryId,
        description: patch.description !== undefined ? patch.description.trim().slice(0, 120) : prev.description,
        date: patch.date ?? prev.date,
        projectId: patch.projectId !== undefined ? patch.projectId : prev.projectId,
        goalId: patch.goalId !== undefined ? patch.goalId : prev.goalId,
      };
      const transactions = get().transactions.map((t) => (t.id === id ? next : t));
      let goals = get().goals;
      if (prev.goalId !== next.goalId) {
        goals = applyGoalDelta(goals, prev.goalId, -signedDelta(prev));
        goals = applyGoalDelta(goals, next.goalId, signedDelta(next));
      } else {
        goals = applyGoalDelta(goals, next.goalId, signedDelta(next) - signedDelta(prev));
      }
      set({ transactions, goals });
      persist({ transactions, categories: get().categories, goals });
    },

    deleteTransaction: (id) => {
      const prev = get().transactions.find((t) => t.id === id);
      if (!prev) return;
      const transactions = get().transactions.filter((t) => t.id !== id);
      const goals = applyGoalDelta(get().goals, prev.goalId, -signedDelta(prev));
      set({ transactions, goals });
      persist({ transactions, categories: get().categories, goals });
    },

    createCategory: (input) => {
      const cat: FinanceCategory = {
        id: generateId(),
        name: input.name.trim().slice(0, 40),
        color: input.color,
        kind: input.kind,
        builtin: false,
      };
      const categories = [...get().categories, cat];
      set({ categories });
      persist({ transactions: get().transactions, categories, goals: get().goals });
      return cat;
    },

    updateCategory: (id, patch) => {
      const categories = get().categories.map((c) =>
        c.id === id
          ? {
              ...c,
              name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || c.name : c.name,
              color: patch.color !== undefined ? patch.color : c.color,
              kind: patch.kind ?? c.kind,
            }
          : c,
      );
      set({ categories });
      persist({ transactions: get().transactions, categories, goals: get().goals });
    },

    deleteCategory: (id) => {
      const cat = get().categories.find((c) => c.id === id);
      if (!cat || cat.builtin || id === OUTROS_CATEGORY_ID) return false;
      const categories = get().categories.filter((c) => c.id !== id);
      const transactions = get().transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: OUTROS_CATEGORY_ID } : t));
      set({ categories, transactions });
      persist({ transactions, categories, goals: get().goals });
      return true;
    },

    createGoal: (input) => {
      const goal: Goal = {
        id: generateId(),
        name: input.name.trim().slice(0, 80),
        targetCents: Math.max(1, Math.round(input.targetCents)),
        currentCents: 0,
        deadline: input.deadline,
        createdAt: nowIso(),
        archived: false,
      };
      const goals = [goal, ...get().goals];
      set({ goals });
      persist({ transactions: get().transactions, categories: get().categories, goals });
      return goal;
    },

    updateGoal: (id, patch) => {
      const goals = get().goals.map((g) =>
        g.id === id
          ? {
              ...g,
              name: patch.name !== undefined ? patch.name.trim().slice(0, 80) || g.name : g.name,
              targetCents: patch.targetCents !== undefined ? Math.max(1, Math.round(patch.targetCents)) : g.targetCents,
              deadline: patch.deadline !== undefined ? patch.deadline : g.deadline,
            }
          : g,
      );
      set({ goals });
      persist({ transactions: get().transactions, categories: get().categories, goals });
    },

    addToGoal: (id, deltaCents) => {
      const goals = get().goals.map((g) =>
        g.id === id ? { ...g, currentCents: Math.max(0, g.currentCents + Math.round(deltaCents)) } : g,
      );
      set({ goals });
      persist({ transactions: get().transactions, categories: get().categories, goals });
    },

    archiveGoal: (id, archived) => {
      const goals = get().goals.map((g) => (g.id === id ? { ...g, archived } : g));
      set({ goals });
      persist({ transactions: get().transactions, categories: get().categories, goals });
    },

    deleteGoal: (id) => {
      const goals = get().goals.filter((g) => g.id !== id);
      const transactions = get().transactions.map((t) => (t.goalId === id ? { ...t, goalId: null } : t));
      set({ goals, transactions });
      persist({ transactions, categories: get().categories, goals });
    },
  };
});
