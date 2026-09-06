import type { TaskStatus } from '../types';
import { generateId, nowIso } from '../utils/core';
import { getDB } from './idb';

export type ActivityEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.moved'
  | 'task.completed'
  | 'task.reopened'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'tag.created'
  | 'tag.updated'
  | 'tag.deleted';

export type ActivityEntity = 'task' | 'project' | 'tag';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  entity: ActivityEntity;
  entityId: string;
  /** Escopo para filtros (projeto da tarefa na hora do evento; próprio id p/ projeto). */
  projectId?: string;
  /** Instante ISO. Sobrescrito só por seed/backfill histórico. */
  at: string;
  /** Snapshot mínimo p/ exibir (títulos de entidades já excluídas). Sem snapshots completos. */
  meta?: {
    title?: string;
    name?: string;
    status?: TaskStatus;
    from?: string;
    to?: string;
    fields?: string[];
    tagIds?: string[];
    tasks?: number;
    duplicateOf?: string;
    recurring?: boolean;
  };
}

export type NewActivityEvent = Omit<ActivityEvent, 'id' | 'at'> & { at?: string };

/** Retenção do log: 90 dias (constante documentada; sem UI — ver Fase 6). */
export const ACTIVITY_RETENTION_DAYS = 90;
/** Teto de segurança por consulta (paginação futura se estourar). */
export const ACTIVITY_QUERY_LIMIT = 2000;

function toEvent(input: NewActivityEvent): ActivityEvent {
  return {
    id: generateId(),
    ...input,
    // `at` explícito (seed/backfill) vence; `undefined` nunca apaga o padrão.
    at: input.at ?? nowIso(),
    meta: input.meta ?? {},
  };
}

// Fila interna: escritas encadeadas (sem bloquear a UI) + flush p/ testes.
let tail: Promise<void> = Promise.resolve();

function enqueue(write: () => Promise<void>): void {
  tail = tail.then(write).catch(() => {});
}

/** Registra um evento (fire-and-forget; nunca lança). */
export function logEvent(input: NewActivityEvent): void {
  const event = toEvent(input);
  invalidateQueryCache();
  enqueue(async () => {
    const db = await getDB();
    await db.put('activity', event, event.id);
  });
}

/** Lote (seed/backfill). Uma transação, um flush. */
export function logEventsBulk(inputs: NewActivityEvent[]): void {
  if (inputs.length === 0) return;
  const events = inputs.map(toEvent);
  invalidateQueryCache();
  enqueue(async () => {
    const db = await getDB();
    const tx = db.transaction('activity', 'readwrite');
    await Promise.all(events.map((e) => tx.store.put(e, e.id)));
    await tx.done;
  });
}

/** Aguarda a fila esvaziar (testes; E2E usa espera por conteúdo). */
export function flushActivity(): Promise<void> {
  return tail.then(() => {});
}

// Cache de consultas para o hook `use()` do React (Suspense sem efeitos).
// Invalidado a cada escrita: leitura nunca serve dado obsoleto.
const queryCache = new Map<string, Promise<ActivityEvent[]>>();

function invalidateQueryCache(): void {
  queryCache.clear();
}

/** Mesma consulta, com cache por argumentos (para `use()` + Suspense). */
export function queryEventsCached(q: ActivityQuery = {}): Promise<ActivityEvent[]> {
  const key = JSON.stringify(q);
  let pending = queryCache.get(key);
  if (!pending) {
    // Drena escritas pendentes antes de ler: nunca serve dado obsoleto.
    pending = tail
      .then(() => queryEvents(q))
      .catch((err: unknown) => {
        console.error('[ForgeBoard] falha ao consultar atividades:', err);
        return [];
      });
    queryCache.set(key, pending);
  }
  return pending;
}

export interface ActivityQuery {
  projectId?: string;
  tagId?: string;
  types?: ActivityEventType[];
  since?: string;
  until?: string;
  limit?: number;
}

/** Consulta por índice de tempo + filtros em memória (volume local é pequeno). */
export async function queryEvents(q: ActivityQuery = {}): Promise<ActivityEvent[]> {
  const db = await getDB();
  const limit = Math.min(q.limit ?? 200, ACTIVITY_QUERY_LIMIT);
  let all: ActivityEvent[];
  const range =
    q.since || q.until
      ? IDBKeyRange.bound(q.since ?? '', q.until ?? '\uffff')
      : null;
  if (range) {
    all = await db.getAllFromIndex('activity', 'by-at', range);
  } else {
    all = await db.getAll('activity');
  }
  return all
    .filter((e) => !q.projectId || e.projectId === q.projectId)
    .filter((e) => !q.tagId || e.meta?.tagIds?.includes(q.tagId!))
    .filter((e) => !q.types || q.types.includes(e.type))
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

/** Apaga eventos mais antigos que o ISO informado. Retorna quantos saíram. */
export async function pruneActivity(olderThanIso: string): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('activity', 'readwrite');
  const index = tx.store.index('by-at');
  let count = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(olderThanIso, true));
  while (cursor) {
    await cursor.delete();
    count += 1;
    cursor = await cursor.continue();
  }
  await tx.done;
  return count;
}

export async function countEvents(): Promise<number> {
  try {
    return await (await getDB()).count('activity');
  } catch {
    return 0;
  }
}

/** Transições de status → eventos (Kanban e modal usam a mesma regra). */
export function statusTransitionEvents(
  taskId: string,
  projectId: string,
  title: string,
  from: TaskStatus,
  to: TaskStatus,
  tagIds: string[],
  at?: string,
): NewActivityEvent[] {
  const base = { entity: 'task' as const, entityId: taskId, projectId, at };
  const events: NewActivityEvent[] = [
    { ...base, type: 'task.moved', meta: { title, from, to, tagIds } },
  ];
  if (to === 'done' && from !== 'done') {
    events.push({ ...base, type: 'task.completed', meta: { title, from, tagIds } });
  } else if (from === 'done' && to !== 'done') {
    events.push({ ...base, type: 'task.reopened', meta: { title, to, tagIds } });
  }
  return events;
}
