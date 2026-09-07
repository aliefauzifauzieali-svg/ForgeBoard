import { useEffect, useRef, useState } from 'react';
import { MAX_NOTES_LENGTH, persistQuickNotes, readQuickNotes } from '../../storage/boardStorage';

const SAVE_MS = 500;

/**
 * Bloco "Notas Rápidas" do Dashboard: textarea com salvamento automático
 * (debounce) no IndexedDB (`kv.quickNotes`). Sem histórico/undo.
 */
export function QuickNotes(): React.JSX.Element {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved'>('loading');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    void readQuickNotes().then((t) => {
      if (!alive) return;
      setText(t);
      setStatus('saved');
    });
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      // Descarrega edição pendente ao desmontar.
      if (pending.current !== null) void persistQuickNotes(pending.current);
    };
  }, []);

  const onChange = (v: string): void => {
    const value = v.slice(0, MAX_NOTES_LENGTH);
    setText(value);
    setStatus('saving');
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      void persistQuickNotes(value).then(() => setStatus('saved'));
    }, SAVE_MS);
  };

  return (
    <section aria-labelledby="notes-heading" className="card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="notes-heading" className="text-sm font-bold">
          Notas rápidas
        </h2>
        <p role="status" className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {status === 'loading' ? 'Carregando…' : status === 'saving' ? 'Salvando…' : 'Salvo'}
        </p>
      </div>
      <label htmlFor="quick-notes" className="sr-only">
        Notas rápidas (salvas automaticamente neste dispositivo)
      </label>
      <textarea
        id="quick-notes"
        className="input min-h-24 resize-y"
        value={text}
        maxLength={MAX_NOTES_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rascunhos, lembretes, links…"
      />
    </section>
  );
}
