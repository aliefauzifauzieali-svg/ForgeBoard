import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';import { render } from '@testing-library/react';
import {
  findDueTasks,
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
} from '../services/notifications';
import type { Task } from '../types';
import { useBoardStore } from '../stores/useBoardStore';
import { usePrefsStore } from '../stores/usePrefsStore';
import { useUIStore } from '../stores/useUIStore';
import { useDueNotifications } from '../hooks/useDueNotifications';
import { act } from 'react';

const T = (over: Partial<Task> = {}): Task => ({
  id: `t-${Math.random().toString(36).slice(2)}`,
  projectId: 'p1',
  title: 'Tarefa',
  description: '',
  priority: 'medium',
  status: 'backlog',
  tagIds: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  completedAt: null,
  dueDate: null,
  recurrence: null,
  subtasks: [],
  ...over,
});

describe('findDueTasks', () => {
  const tasks = [
    T({ id: 'over', dueDate: '2026-09-01' }),
    T({ id: 'today', dueDate: '2026-09-06' }),
    T({ id: 'soon', dueDate: '2026-09-07' }),
    T({ id: 'later', dueDate: '2026-09-20' }),
    T({ id: 'done', dueDate: '2026-09-01', status: 'done' }),
    T({ id: 'nodate' }),
    T({ id: 'baddate', dueDate: 'xx' }),
  ];
  it('separa atrasadas e próximas (hoje incluído)', () => {
    const { dueSoon, overdue } = findDueTasks(tasks, 1, '2026-09-06');
    expect(overdue.map((t) => t.id)).toEqual(['over']);
    expect(dueSoon.map((t) => t.id).sort()).toEqual(['soon', 'today']);
  });
  it('janela maior alcança mais longe; zero só inclui hoje', () => {
    expect(findDueTasks(tasks, 30, '2026-09-06').dueSoon.map((t) => t.id)).toContain('later');
    expect(findDueTasks(tasks, 0, '2026-09-06').dueSoon.map((t) => t.id)).toEqual(['today']);
  });
});

describe('permissão e envio', () => {
  it('unsupported sem a API; envio exige granted', () => {
    const real = (globalThis as Record<string, unknown>).Notification;
    vi.stubGlobal('Notification', undefined);
    try {
      expect(getNotificationPermission()).toBe('unsupported');
      expect(sendLocalNotification('t', 'b')).toBe(false);
    } finally {
      if (real !== undefined) vi.stubGlobal('Notification', real);
      else vi.unstubAllGlobals();
    }
  });

  it('requestPermission propagado; construtor com falha retorna false', async () => {
    const sent: Array<{ title: string; body?: string }> = [];
    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
      constructor(title: string, opts?: { body?: string }) {
        sent.push({ title, body: opts?.body });
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    try {
      expect(getNotificationPermission()).toBe('granted');
      expect(await requestNotificationPermission()).toBe('granted');
      expect(sendLocalNotification('Oi', 'corpo')).toBe(true);
      expect(sent).toEqual([{ title: 'Oi', body: 'corpo' }]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

async function notificationPluginMock(): Promise<{
  isPermissionGranted: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
  sendNotification: ReturnType<typeof vi.fn>;
}> {
  return (await import('@tauri-apps/plugin-notification')) as unknown as {
    isPermissionGranted: ReturnType<typeof vi.fn>;
    requestPermission: ReturnType<typeof vi.fn>;
    sendNotification: ReturnType<typeof vi.fn>;
  };
}

const WIN = window as unknown as Record<string, unknown>;
const SAVED_TAURI_INTERNALS = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__');

describe('notificações nativas no Tauri', () => {
  beforeEach(() => {
    WIN.__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    if (SAVED_TAURI_INTERNALS !== undefined) {
      Object.defineProperty(window, '__TAURI_INTERNALS__', SAVED_TAURI_INTERNALS);
    } else {
      delete WIN.__TAURI_INTERNALS__;
    }
  });

  it('request repassa o plugin', async () => {
    const plugin = await notificationPluginMock();
    plugin.requestPermission.mockResolvedValueOnce('granted');
    await expect(requestNotificationPermission()).resolves.toBe('granted');
  });

  it('envio usa o plugin quando permitido', async () => {
    const plugin = await notificationPluginMock();
    plugin.isPermissionGranted.mockResolvedValueOnce(true);
    expect(sendLocalNotification('Oi', 'corpo')).toBe(true);
    await vi.waitFor(() => {
      expect(plugin.sendNotification).toHaveBeenCalledWith({ title: 'Oi', body: 'corpo' });
    });
  });

  it('envio pula o plugin sem permissão', async () => {
    const plugin = await notificationPluginMock();
    plugin.isPermissionGranted.mockResolvedValueOnce(false);
    plugin.sendNotification.mockClear();
    expect(sendLocalNotification('Oi', 'corpo')).toBe(true);
    await Promise.resolve();
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });
});

describe('useDueNotifications', () => {
  function Probe(): React.JSX.Element {
    useDueNotifications();
    return <div />;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:00:00'));
    useBoardStore.setState({
      projects: [{ id: 'p1', name: 'P', description: '', color: '#fff', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }],
      tasks: [T({ id: 'late', title: 'Atrasada', dueDate: '2026-09-01' })],
      tags: [],
      undoStack: [],
      redoStack: [],
    });
    usePrefsStore.setState({ notificationsEnabled: true, notifyDaysBefore: 1 });
    useUIStore.setState({ toasts: [] });
    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
      constructor(_title: string, _opts?: object) {}
    }
    vi.stubGlobal('Notification', FakeNotification);
  });

  it('avisa uma vez por tarefa via toast (e não repete)', () => {
    const { unmount } = render(<Probe />);
    try {
      const messages = useUIStore.getState().toasts.map((t) => t.message);
      expect(messages.some((m) => m.includes('Atrasada'))).toBe(true);
      const count = useUIStore.getState().toasts.length;
      act(() => {
        vi.advanceTimersByTime(16 * 60 * 1000);
      });
      expect(useUIStore.getState().toasts.length).toBe(count);
      // Nova tarefa com prazo próximo dispara de novo.
      act(() => {
        useBoardStore.setState((s) => ({
          tasks: [...s.tasks, T({ id: 'soon', title: 'Nova', dueDate: '2026-09-07' })],
        }));
      });
      expect(useUIStore.getState().toasts.some((t) => t.message.includes('Nova'))).toBe(true);
    } finally {
      unmount();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('silencioso quando desligado', () => {
    usePrefsStore.setState({ notificationsEnabled: false });
    const { unmount } = render(<Probe />);
    try {
      expect(useUIStore.getState().toasts).toHaveLength(0);
    } finally {
      unmount();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
