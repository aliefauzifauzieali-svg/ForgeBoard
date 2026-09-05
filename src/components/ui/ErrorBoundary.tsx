import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { downloadJson, datedFilename } from '../../services/download';
import { clearAllLocalData, readRawBoard } from '../../storage/boardStorage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  armed: boolean;
}

/**
 * Última linha de defesa: se qualquer parte da UI quebrar em render,
 * mostra uma tela de recuperação em vez de tela em branco — com opção
 * de exportar os dados brutos antes de recomeçar.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, armed: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[ForgeBoard] erro capturado pelo ErrorBoundary:', error);
  }

  private downloadBackup = (): void => {
    void readRawBoard().then((raw) => {
      if (!raw) return;
      downloadJson(datedFilename('forgeboard-backup'), raw);
    });
  };

  private resetAll = (): void => {
    if (!this.state.armed) {
      this.setState({ armed: true });
      return;
    }
    void clearAllLocalData().finally(() => window.location.reload());
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
        <div role="alert" className="card w-full max-w-md p-6 text-center">
          <span
            aria-hidden
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400"
          >
            <AlertTriangle size={24} />
          </span>
          <h1 className="mt-4 text-lg font-extrabold">Algo deu errado</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            O ForgeBoard encontrou um erro inesperado. Seus dados continuam salvos no navegador —
            exporte um backup antes de recomeçar, se quiser.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className="btn-ghost w-full" onClick={this.downloadBackup}>
              Exportar backup dos dados
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              onClick={this.resetAll}
            >
              {this.state.armed ? 'Clique novamente para apagar tudo e recarregar' : 'Apagar tudo e recomeçar'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
