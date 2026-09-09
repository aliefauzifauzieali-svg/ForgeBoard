import { create } from 'zustand';
import type { Habit } from '../types';
import { generateId, nowIso } from '../utils/core';
import { getKV, setKV } from '../storage/idb';
import { isScheduledOn, isoDay } from '../services/habits';

const KV_HABITS = 'habit-data';

interface HabitData {
  habits: Habit[];
  completions: Record<string, string[]>;
}

function sanitizeHabit(raw: unknown): Habit | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const h = raw as Partial<Habit>;
  if (typeof h.id !== 'string' || h.id === '' || typeof h.name !== 'string') return null;
  if (typeof h.createdAt !== 'string') return null;
  let schedule: Habit['schedule'] = { kind: 'daily' };
  const s = h.schedule as Habit['schedule'] | undefined;
  if (s?.kind === 'weekly') {
    schedule = { kind: 'weekly', days: (s.days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) };
  }
  return {
    id: h.id,
    name: h.name.slice(0, 80),
    color: typeof h.color === 'string' ? h.color : undefined,
    schedule,
    createdAt: h.createdAt,
    archived: h.archived === true,
  };
}

function persist(habits: Habit[], completions: Record<string, string[]>): void {
  void setKV(KV_HABITS, { habits, completions } satisfies HabitData).catch(() => {});
}

interface HabitState extends HabitData {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createHabit: (input: { name: string; color?: string; schedule: Habit['schedule'] }) => Habit;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'color' | 'schedule'>>) => void;
  archiveHabit: (id: string, archived: boolean) => void;
  deleteHabit: (id: string) => void;
  toggleDone: (id: string, iso?: string) => void;
  isDone: (id: string, iso?: string) => boolean;
}

/** Hábitos diários/semanais + conclusões por dia (`kv.habit-data`). */
export const useHabitStore = create<HabitState>()((set, get) => ({
  habits: [],
  completions: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await getKV<unknown>(KV_HABITS);
      if (typeof raw === 'object' && raw !== null) {
        const data = raw as Partial<HabitData>;
        const habits = Array.isArray(data.habits) ? data.habits.map(sanitizeHabit).filter((h): h is Habit => h !== null) : [];
        const completions: Record<string, string[]> =
          data.completions && typeof data.completions === 'object'
            ? Object.fromEntries(
                Object.entries(data.completions).filter(
                  (e): e is [string, string[]] => Array.isArray(e[1]) && e[1].every((d) => typeof d === 'string'),
                ),
              )
            : {};
        set({ habits, completions, hydrated: true });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },

  createHabit: (input) => {
    const habit: Habit = {
      id: generateId(),
      name: input.name.trim().slice(0, 80),
      color: input.color,
      schedule: input.schedule,
      createdAt: nowIso(),
      archived: false,
    };
    const habits = [habit, ...get().habits];
    set({ habits });
    persist(habits, get().completions);
    return habit;
  },

  updateHabit: (id, patch) => {
    const habits = get().habits.map((h) =>
      h.id === id
        ? {
            ...h,
            name: patch.name !== undefined ? patch.name.trim().slice(0, 80) || h.name : h.name,
            color: patch.color !== undefined ? patch.color : h.color,
            schedule: patch.schedule ?? h.schedule,
          }
        : h,
    );
    set({ habits });
    persist(habits, get().completions);
  },

  archiveHabit: (id, archived) => {
    const habits = get().habits.map((h) => (h.id === id ? { ...h, archived } : h));
    set({ habits });
    persist(habits, get().completions);
  },

  deleteHabit: (id) => {
    const habits = get().habits.filter((h) => h.id !== id);
    const completions = { ...get().completions };
    delete completions[id];
    set({ habits, completions });
    persist(habits, completions);
  },

  toggleDone: (id, iso) => {
    const day = iso ?? isoDay(new Date());
    const completions = { ...get().completions };
    const list = completions[id] ?? [];
    completions[id] = list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
    set({ completions });
    persist(get().habits, completions);
  },

  isDone: (id, iso) => {
    const day = iso ?? isoDay(new Date());
    return (get().completions[id] ?? []).includes(day);
  },
}));

export { isScheduledOn };
