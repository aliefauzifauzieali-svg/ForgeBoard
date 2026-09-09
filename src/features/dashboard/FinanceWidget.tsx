import { useEffect, useMemo } from 'react';
import { formatBRL, monthBalance, monthKey, totalsByCategory } from '../../services/finance';
import { useFinanceStore } from '../../stores/useFinanceStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/core';

/** Widget do Dashboard: saldo do mês, maior gasto e meta em destaque. */
export function FinanceWidget(): React.JSX.Element {
  const hydrate = useFinanceStore((s) => s.hydrate);
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const goals = useFinanceStore((s) => s.goals);
  const goFinance = useUIStore((s) => s.goFinance);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const month = useMemo(() => monthKey(new Date()), []);
  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(month)), [transactions, month]);
  const balance = useMemo(() => monthBalance(monthTx), [monthTx]);
  const topExpense = useMemo(() => totalsByCategory(monthTx.filter((t) => t.kind === 'expense'))[0], [monthTx]);
  const topCat = categories.find((c) => c.id === topExpense?.categoryId);
  const featured = useMemo(() => goals.find((g) => !g.archived), [goals]);
  const pct = featured ? Math.min(100, Math.round((featured.currentCents / featured.targetCents) * 100)) : 0;

  return (
    <section aria-labelledby="finance-heading" className="card card-hover p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="finance-heading" className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">
          Resumo financeiro
        </h2>
        <span className={cn('text-sm font-extrabold tabular-nums', balance.balance < 0 ? 'text-red-500' : null)}>
          {formatBRL(balance.balance)}
        </span>
      </div>
      {monthTx.length === 0 && !featured ? (
        <div className="mt-3 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Nenhum movimento este mês.</p>
          <button type="button" className="btn-secondary mt-2 !py-1.5 text-xs" onClick={goFinance}>
            Abrir Economia
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Maior gasto</span>
            <strong className="truncate tabular-nums">
              {topExpense ? `${topCat?.name ?? '—'} · ${formatBRL(topExpense.total)}` : '—'}
            </strong>
          </div>
          {featured ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">{featured.name}</span>
                <strong className="shrink-0 tabular-nums">{pct}%</strong>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso da meta ${featured.name}`}>
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={goFinance}
            className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Abrir Economia →
          </button>
        </div>
      )}
    </section>
  );
}
