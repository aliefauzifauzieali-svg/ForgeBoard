import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Atalhos globais:
 *  N → nova tarefa · P → novo projeto · / → pesquisa · Esc → fechar modal/drawer
 * Ignorados enquanto o usuário digita em input/textarea.
 */
export function useKeyboardShortcuts(searchRef: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const state = useUIStore.getState();

      if (e.key === 'Escape') {
        if (state.confirm.open) state.closeConfirm();
        else if (state.taskModal.open) state.closeTaskModal();
        else if (state.projectModal.open) state.closeProjectModal();
        else if (state.sidebarOpen) state.setSidebarOpen(false);
        return;
      }

      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      // Com qualquer diálogo aberto, só o Esc age (evita empilhar modais).
      if (state.confirm.open || state.taskModal.open || state.projectModal.open) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const view = state.view;
        state.openNewTask(view.kind === 'project' ? view.projectId : null, null);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        state.openNewProject();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchRef]);
}
