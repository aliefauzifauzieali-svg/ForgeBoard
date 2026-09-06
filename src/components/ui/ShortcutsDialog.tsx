import { Keyboard } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { Modal } from './Modal';

const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform ?? '');

function mod(): string {
  return isMac ? '⌘' : 'Ctrl';
}

const ROWS: Array<{ keys: string[]; action: string }> = [
  { keys: ['N'], action: 'Nova tarefa (no projeto aberto)' },
  { keys: ['T'], action: 'Nova tarefa com o prazo de hoje' },
  { keys: ['P'], action: 'Novo projeto' },
  { keys: ['/'], action: 'Focar a pesquisa' },
  { keys: [mod(), 'K'], action: 'Abrir a paleta de comandos e busca global' },
  { keys: [mod(), 'Z'], action: 'Desfazer última alteração' },
  { keys: [mod(), 'Shift', 'Z'], action: 'Refazer alteração desfeita' },
  { keys: ['?'], action: 'Abrir esta lista de atalhos' },
  { keys: ['↑', '↓'], action: 'Navegar na paleta de comandos' },
  { keys: ['Enter'], action: 'Executar comando / abrir edição' },
  { keys: ['Esc'], action: 'Fechar diálogo, paleta ou menu' },
];

/** Lista todos os atalhos de teclado (abre com `?`). */
export function ShortcutsDialog(): React.JSX.Element {
  const open = useUIStore((s) => s.shortcutsOpen);
  const setOpen = useUIStore((s) => s.setShortcutsOpen);

  return (
    <Modal
      open={open}
      title="Atalhos de teclado"
      description="Os atalhos não funcionam enquanto você digita em campos de texto."
      onClose={() => setOpen(false)}
    >
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Keyboard size={16} aria-hidden />
        <span>
          Use <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 font-bold dark:bg-zinc-800">?</kbd>{' '}
          a qualquer momento para rever esta lista.
        </span>
      </div>
      <table className="mt-4 w-full text-sm">
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.action} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="py-2 pr-4">
                <span className="flex gap-1">
                  {row.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-300">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
