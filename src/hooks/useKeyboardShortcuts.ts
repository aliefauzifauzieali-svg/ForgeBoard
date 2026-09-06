import { useEffect } from 'react';
import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useUIStore } from '../stores/useUIStore';
import { todayDateOnly } from '../utils/date';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Atalhos globais:
 *  Ctrl/⌘+K → paleta · N → nova tarefa · T → nova tarefa com prazo de hoje
 *  P → novo projeto · / → pesquisa
 *  Ctrl/⌘+Z → desfazer · Ctrl/⌘+Shift+Z ou Ctrl+Y → refazer · ? → atalhos
 *  Esc → fechar (confirmação, paleta, modais, menu)
 * Teclas simples são ignoradas digitando ou com diálogos abertos.
 */
export function useKeyboardShortcuts(searchRef: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const state = useUIStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      // Paleta funciona em qualquer lugar, inclusive em campos de texto.
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        state.togglePalette();
        return;
      }

      if (e.key === 'Escape') {
        if (state.confirm.open) state.closeConfirm();
        else if (state.paletteOpen) state.setPaletteOpen(false);
        else if (state.shortcutsOpen) state.setShortcutsOpen(false);
        else if (state.settingsOpen) state.setSettingsOpen(false);
        else if (state.taskModal.open) state.closeTaskModal();
        else if (state.projectModal.open) state.closeProjectModal();
        else if (state.sidebarOpen) state.setSidebarOpen(false);
        return;
      }

      if (isTypingTarget(e.target)) return;

      // Com qualquer diálogo aberto, só o Esc age (evita empilhar modais).
      if (
        state.confirm.open ||
        state.taskModal.open ||
        state.projectModal.open ||
        state.paletteOpen ||
        state.shortcutsOpen ||
        state.settingsOpen
      ) {
        return;
      }

      if (mod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        useBoardStore.getState().undo();
        return;
      }
      if (
        (mod && (e.key === 'y' || e.key === 'Y')) ||
        (mod && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        useBoardStore.getState().redo();
        return;
      }
      if (mod || e.altKey) return;

      // Preferência permite desligar os atalhos de letra.
      const lettersOn = usePrefsStore.getState().shortcutsEnabled;

      if (e.key === 'n' || e.key === 'N') {
        if (!lettersOn) return;
        e.preventDefault();
        const view = state.view;
        state.openNewTask(view.kind === 'project' ? view.projectId : null, null);
      } else if (e.key === 't' || e.key === 'T') {
        if (!lettersOn) return;
        e.preventDefault();
        const view = state.view;
        state.openNewTask(view.kind === 'project' ? view.projectId : null, null, todayDateOnly());
      } else if (e.key === 'p' || e.key === 'P') {
        if (!lettersOn) return;
        e.preventDefault();
        state.openNewProject();
      } else if (e.key === '/') {
        if (!lettersOn) return;
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '?') {
        if (!lettersOn) return;
        e.preventDefault();
        state.setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchRef]);
}
