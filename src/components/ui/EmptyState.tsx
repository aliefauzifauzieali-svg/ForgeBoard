import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center animate-fade-up">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
      >
        <Icon size={24} />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
