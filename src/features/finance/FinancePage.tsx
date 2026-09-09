import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/core';
import {
  filterTransactions,
  formatBRL,
  monthBalance,
  monthKey,
  monthLabel,
  parseAmountToCents,
  shiftMonth,
  totalsByCategory,
} from '../../services/finance';
import { useBoardStore } from '../../stores/useBoardStore';
import { useFinanceStore, type TransactionInput } from '../../stores/useFinanceStore';
import type { FinanceCategory, Goal, Transaction } from '../../types';
import { isoDay } from '../../services/habits';

const PALETTE = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

function categoryById(categories: FinanceCategory[]): Map<string, FinanceCategory> {
  return new Map(categories.map((c) => [c.id, c]));
}

function TransactionModal({
  editing,
  defaultKind,
  onDone,
}: {
  editing: Transaction | null;
  defaultKind: 'income' | 'expense';
  onDone: () => void;
}): React.JSX.Element {
  const categories = useFinanceStore((s) => s.categories);
  const goals = useFinanceStore((s) => s.goals);
  const projects = useBoardStore((s) => s.projects);
  const createTransaction = useFinanceStore((s) => s.createTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);

  const [kind, setKind] = useState<'income' | 'expense'>(editing?.kind ?? defaultKind);
  const [amount, setAmount] = useState(editing ? (editing.amountCents / 100).toFixed(2).replace('.', ',') : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [date, setDate] = useState(editing?.date ?? isoDay(new Date()));
  const [projectId, setProjectId] = useState(editing?.projectId ?? '');
  const [goalId, setGoalId] = useState(editing?.goalId ?? '');
  const [error, setError] = useState('');

  const compatible = useMemo(
    () => categories.filter((c) => c.kind === kind || c.kind === 'both'),
    [categories, kind],
  );
  const effectiveCategory = compatible.some((c) => c.id === categoryId) ? categoryId : (compatible[0]?.id ?? '');
  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);

  const save = (): void => {
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Informe um valor válido maior que zero (ex.: 49,90).');
      return;
    }
    if (effectiveCategory === '') {
      setError('Escolha uma categoria.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Informe uma data válida.');
      return;
    }
    const input: TransactionInput = {
      kind,
      amountCents,
      categoryId: effectiveCategory,
      description,
      date,
      projectId: projectId === '' ? null : projectId,
      goalId: goalId === '' ? null : goalId,
    };
    if (editing) updateTransaction(editing.id, input);
    else createTransaction(input);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 sm:items-center" onClick={onDone} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Editar transação' : 'Nova transação'}
        className="card max-h-[90dvh] w-full max-w-md overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-extrabold tracking-tight">{editing ? 'Editar transação' : 'Nova transação'}</h2>
        <div className="mt-3 flex gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Tipo">
          {(['expense', 'income'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]',
                kind === k
                  ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {k === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tx-amount">Valor (R$)</label>
            <input
              id="tx-amount"
              className="input tabular-nums"
              inputMode="decimal"
              placeholder="0,00"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- modal: foco inicial no valor
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tx-date">Data</label>
            <input id="tx-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="tx-desc">Descrição</label>
          <input
            id="tx-desc"
            className="input"
            value={description}
            maxLength={120}
            placeholder="Ex.: Supermercado semanal"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tx-category">Categoria</label>
            <select id="tx-category" className="input" value={effectiveCategory} onChange={(e) => setCategoryId(e.target.value)}>
              {compatible.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-goal">Meta (opcional)</label>
            <select id="tx-goal" className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">Nenhuma</option>
              {activeGoals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="tx-project">Projeto (opcional)</label>
          <select id="tx-project" className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Nenhum</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {error !== '' ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={save}>
            {editing ? 'Salvar alterações' : 'Adicionar'}
          </button>
          <button type="button" className="btn-secondary" onClick={onDone}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx, cat, onEdit }: { tx: Transaction; cat: FinanceCategory | undefined; onEdit: (tx: Transaction) => void }): React.JSX.Element {
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const [dd, mm] = [tx.date.slice(8, 10), tx.date.slice(5, 7)];
  const isIncome = tx.kind === 'income';
  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-200/80 px-3 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <span
        aria-hidden
        className="h-9 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: cat?.color ?? '#71717A' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{tx.description === '' ? (cat?.name ?? 'Transação') : tx.description}</p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {dd}/{mm} · {cat?.name ?? 'Categoria removida'}
        </p>
      </div>
      <span className={cn('shrink-0 text-sm font-bold tabular-nums', isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100')}>
        {isIncome ? '+' : '−'}{formatBRL(tx.amountCents)}
      </span>
      <button type="button" className="icon-btn !h-8 !w-8" title="Editar" aria-label={`Editar transação ${tx.description === '' ? (cat?.name ?? '') : tx.description}`} onClick={() => onEdit(tx)}>
        <Pencil size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="icon-btn !h-8 !w-8 hover:!text-red-500"
        title="Excluir"
        aria-label={`Excluir transação ${tx.description === '' ? (cat?.name ?? '') : tx.description}`}
        onClick={() => {
          if (window.confirm('Excluir esta transação? (O progresso da meta vinculada será ajustado.)')) deleteTransaction(tx.id);
        }}
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </li>
  );
}

/** Edição via modal: estado local da página (evita store de UI nova). */
function GoalCard({ goal }: { goal: Goal }): React.JSX.Element {
  const addToGoal = useFinanceStore((s) => s.addToGoal);
  const archiveGoal = useFinanceStore((s) => s.archiveGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const [aportando, setAportando] = useState(false);
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const pct = Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100));

  const commit = (): void => {
    const cents = parseAmountToCents(valor);
    if (cents === null) {
      setError('Valor inválido.');
      return;
    }
    addToGoal(goal.id, cents);
    setValor('');
    setAportando(false);
  };

  return (
    <li className="rounded-xl border border-zinc-200/80 p-3 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{goal.name}</p>
          <p className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatBRL(goal.currentCents)} de {formatBRL(goal.targetCents)}
            {goal.deadline ? ` · até ${goal.deadline.slice(8, 10)}/${goal.deadline.slice(5, 7)}/${goal.deadline.slice(0, 4)}` : ''}
          </p>
        </div>
        <span className="shrink-0 text-xs font-extrabold tabular-nums">{pct}%</span>
        {goal.archived ? (
          <button type="button" className="icon-btn !h-8 !w-8" title="Reativar" aria-label={`Reativar meta ${goal.name}`} onClick={() => archiveGoal(goal.id, false)}>
            <RotateCcw size={14} aria-hidden />
          </button>
        ) : (
          <button type="button" className="icon-btn !h-8 !w-8" title="Arquivar" aria-label={`Arquivar meta ${goal.name}`} onClick={() => archiveGoal(goal.id, true)}>
            <Archive size={14} aria-hidden />
          </button>
        )}
        <button
          type="button"
          className="icon-btn !h-8 !w-8 hover:!text-red-500"
          title="Excluir"
          aria-label={`Excluir meta ${goal.name}`}
          onClick={() => {
            if (window.confirm(`Excluir a meta "${goal.name}"? As transações vinculadas permanecem.`)) deleteGoal(goal.id);
          }}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso da meta ${goal.name}`}>
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      {!goal.archived ? (
        aportando ? (
          <div className="mt-2">
            <div className="flex gap-2">
              <input
                className="input !py-1.5 text-sm tabular-nums"
                inputMode="decimal"
                placeholder="Valor do aporte"
                aria-label={`Valor do aporte para ${goal.name}`}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <button type="button" className="btn-primary !py-1.5 text-xs" onClick={commit}>Aportar</button>
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setAportando(false)}>Fechar</button>
            </div>
            {error !== '' ? <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setError(''); setAportando(true); }}
            className="mt-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Aporte manual
          </button>
        )
      ) : null}
    </li>
  );
}

function GoalForm({ onDone }: { onDone: () => void }): React.JSX.Element {
  const createGoal = useFinanceStore((s) => s.createGoal);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const save = (): void => {
    if (name.trim() === '') {
      setError('Dê um nome à meta.');
      return;
    }
    const targetCents = parseAmountToCents(target);
    if (targetCents === null) {
      setError('Informe um valor alvo válido.');
      return;
    }
    createGoal({ name, targetCents, deadline: deadline === '' ? null : deadline });
    onDone();
  };

  return (
    <div className="card mb-3 p-4">
      <div>
        <label className="label" htmlFor="goal-name">Nome</label>
        <input id="goal-name" className="input" value={name} maxLength={80} placeholder="Ex.: Reserva de emergência" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="goal-target">Valor alvo (R$)</label>
          <input id="goal-target" className="input tabular-nums" inputMode="decimal" placeholder="0,00" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="goal-deadline">Prazo (opcional)</label>
          <input id="goal-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      {error !== '' ? <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary flex-1" onClick={save}>Criar meta</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

function CategoryManager(): React.JSX.Element {
  const categories = useFinanceStore((s) => s.categories);
  const createCategory = useFinanceStore((s) => s.createCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const deleteCategory = useFinanceStore((s) => s.deleteCategory);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FinanceCategory['kind']>('expense');
  const [color, setColor] = useState(PALETTE[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const save = (): void => {
    if (name.trim() === '') return;
    createCategory({ name, color, kind });
    setName('');
    setShowForm(false);
  };

  return (
    <section aria-labelledby="categories-heading" className="card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 id="categories-heading" className="text-sm font-bold">Categorias ({categories.length})</h2>
        <span className="text-xs font-semibold text-zinc-500">{open ? 'Ocultar' : 'Gerenciar'}</span>
      </button>
      {open ? (
        <div className="mt-3">
          <ul className="space-y-1.5">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-white/[0.04]">
                <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                {renamingId === c.id ? (
                  <input
                    className="input !py-1 text-sm"
                    value={draft}
                    maxLength={40}
                    aria-label="Renomear categoria"
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => { if (draft.trim() !== '') updateCategory(c.id, { name: draft }); setRenamingId(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && draft.trim() !== '') { updateCategory(c.id, { name: draft }); setRenamingId(null); }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {c.name}
                    <span className="ml-1.5 text-[11px] text-zinc-500">
                      {c.kind === 'income' ? 'receita' : c.kind === 'expense' ? 'despesa' : 'ambas'}
                      {c.builtin ? ' · padrão' : ''}
                    </span>
                  </span>
                )}
                <button type="button" className="icon-btn !h-7 !w-7" title="Renomear" aria-label={`Renomear categoria ${c.name}`} onClick={() => { setDraft(c.name); setRenamingId(c.id); }}>
                  <Pencil size={13} aria-hidden />
                </button>
                {!c.builtin ? (
                  <button
                    type="button"
                    className="icon-btn !h-7 !w-7 hover:!text-red-500"
                    title="Excluir (transações vão para Outros)"
                    aria-label={`Excluir categoria ${c.name}`}
                    onClick={() => {
                      if (window.confirm(`Excluir "${c.name}"? Suas transações passam para "Outros".`)) deleteCategory(c.id);
                    }}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {showForm ? (
            <div className="mt-3 rounded-xl border border-zinc-200/80 p-3 dark:border-white/[0.07]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="cat-name">Nome</label>
                  <input id="cat-name" className="input !py-1.5 text-sm" value={name} maxLength={40} placeholder="Ex.: Pets" onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="cat-kind">Tipo</label>
                  <select id="cat-kind" className="input !py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value as FinanceCategory['kind'])}>
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="both">Ambas</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5" role="group" aria-label="Cor da categoria">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn('h-6 w-6 rounded-full transition active:scale-95', color === c && 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900')}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-primary flex-1 !py-1.5 text-xs" onClick={save}>Criar categoria</button>
                <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-secondary mt-2 !py-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus size={14} aria-hidden /> Nova categoria
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Página Economia (Fase 18.3): mês, saldo, gastos por categoria, transações e metas. */
export function FinancePage(): React.JSX.Element {
  const hydrate = useFinanceStore((s) => s.hydrate);
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const goals = useFinanceStore((s) => s.goals);

  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showArchivedGoals, setShowArchivedGoals] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const catOf = useMemo(() => categoryById(categories), [categories]);
  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(month)), [transactions, month]);
  const balance = useMemo(() => monthBalance(monthTx), [monthTx]);
  const expenseByCat = useMemo(
    () => totalsByCategory(monthTx.filter((t) => t.kind === 'expense')),
    [monthTx],
  );
  const maxCat = Math.max(1, ...expenseByCat.map((c) => c.total));
  const visible = useMemo(
    () => filterTransactions(transactions, month, kindFilter, catFilter),
    [transactions, month, kindFilter, catFilter],
  );
  const activeGoals = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const archivedGoals = useMemo(() => goals.filter((g) => g.archived), [goals]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Economia</h1>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button type="button" className="icon-btn !h-8 !w-8" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <p className="min-w-36 text-center text-sm font-bold" aria-live="polite">{monthLabel(month)}</p>
            <button type="button" className="icon-btn !h-8 !w-8" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
            <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => setMonth(monthKey(new Date()))}>Hoje</button>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModal({ open: true, editing: null })}>
          <Plus size={16} aria-hidden /> Nova transação
        </button>
      </div>

      <section aria-label="Resumo do mês" className="grid grid-cols-3 gap-2.5">
        <div className="card p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Receitas</p>
          <p className="mt-0.5 truncate text-base font-extrabold tabular-nums text-emerald-600 sm:text-lg dark:text-emerald-400">{formatBRL(balance.income)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Despesas</p>
          <p className="mt-0.5 truncate text-base font-extrabold tabular-nums text-red-500 sm:text-lg">{formatBRL(balance.expense)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Saldo</p>
          <p className={cn('mt-0.5 truncate text-base font-extrabold tabular-nums sm:text-lg', balance.balance < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100')}>
            {formatBRL(balance.balance)}
          </p>
        </div>
      </section>

      <section aria-labelledby="bycat-heading" className="card mt-4 p-4">
        <h2 id="bycat-heading" className="text-sm font-bold">Gastos por categoria</h2>
        {expenseByCat.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Sem despesas neste mês.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {expenseByCat.map((c) => {
              const cat = catOf.get(c.categoryId);
              return (
                <li key={c.categoryId}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat?.color ?? '#71717A' }} />
                      <span className="truncate">{cat?.name ?? 'Categoria removida'}</span>
                      <span className="shrink-0 font-normal text-zinc-500">×{c.count}</span>
                    </span>
                    <strong className="shrink-0 tabular-nums">{formatBRL(c.total)}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${Math.max(3, Math.round((c.total / maxCat) * 100))}%`, backgroundColor: cat?.color ?? '#71717A' }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Filtrar por tipo">
          {(['all', 'income', 'expense'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kindFilter === k}
              onClick={() => setKindFilter(k)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]',
                kindFilter === k
                  ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {k === 'all' ? 'Todas' : k === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="tx-filter-cat">Filtrar por categoria</label>
        <select id="tx-filter-cat" className="input !w-auto !py-1.5 text-xs" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="card mt-3 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Nenhuma transação neste mês com estes filtros.
        </p>
      ) : (
        <ul className="mt-3 space-y-2" aria-label="Transações do mês">
          {visible.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} cat={catOf.get(tx.categoryId)} onEdit={(t) => setModal({ open: true, editing: t })} />
          ))}
        </ul>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight">Metas financeiras</h2>
        <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setShowGoalForm((v) => !v)} aria-expanded={showGoalForm}>
          <Plus size={14} aria-hidden /> Nova meta
        </button>
      </div>
      {showGoalForm ? <GoalForm onDone={() => setShowGoalForm(false)} /> : null}
      {activeGoals.length === 0 && !showGoalForm ? (
        <p className="card p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Nenhuma meta ainda. Vincule transações a uma meta e o progresso atualiza sozinho.
        </p>
      ) : (
        <ul className="space-y-2.5" aria-label="Metas ativas">
          {activeGoals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </ul>
      )}
      {archivedGoals.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setShowArchivedGoals((v) => !v)}
            aria-expanded={showArchivedGoals}
          >
            {showArchivedGoals ? 'Ocultar' : 'Mostrar'} arquivadas ({archivedGoals.length})
          </button>
          {showArchivedGoals ? (
            <ul className="mt-2 space-y-2.5 opacity-70" aria-label="Metas arquivadas">
              {archivedGoals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <CategoryManager />
      </div>

      {modal.open ? (
        <EditingHost editing={modal.editing} defaultKind={kindFilter === 'income' ? 'income' : 'expense'} onDone={() => setModal({ open: false, editing: null })} />
      ) : null}
    </div>
  );
}

/** Edição via modal: estado local da página (evita store de UI nova). */
function EditingHost({ editing, defaultKind, onDone }: { editing: Transaction | null; defaultKind: 'income' | 'expense'; onDone: () => void }): React.JSX.Element {
  return <TransactionModal key={editing?.id ?? 'new'} editing={editing} defaultKind={defaultKind} onDone={onDone} />;
}
