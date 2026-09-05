import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACTIVITY_RETENTION_DAYS,
  countEvents,
  flushActivity,
  logEvent,
  logEventsBulk,
  pruneActivity,
  queryEvents,
  statusTransitionEvents,
} from '../storage/activity';
import { dangerouslyDeleteDatabase, getDB } from '../storage/idb';

async function reset(): Promise<void> {
  await dangerouslyDeleteDatabase();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

describe('activity log', () => {
  beforeEach(reset);

  it('registra e consulta por projeto, tipo e período', async () => {
    logEvent({ type: 'task.created', entity: 'task', entityId: 't1', projectId: 'p1', meta: { title: 'A' } });
    logEvent({ type: 'task.completed', entity: 'task', entityId: 't1', projectId: 'p1', meta: { title: 'A' } });
    logEvent({ type: 'project.created', entity: 'project', entityId: 'p1', projectId: 'p1', meta: { name: 'P' } });
    await flushActivity();

    expect(await countEvents()).toBe(3);
    expect((await queryEvents({ projectId: 'p1' })).length).toBe(3);
    expect((await queryEvents({ projectId: 'outro' })).length).toBe(0);
    expect((await queryEvents({ types: ['task.completed'] })).map((e) => e.entityId)).toEqual(['t1']);
    // Mais recentes primeiro.
    const all = await queryEvents();
    expect(all.length).toBe(3);
    expect(all[0]!.at >= all[2]!.at).toBe(true);
  });

  it('filtra por etiqueta via meta.tagIds', async () => {
    logEvent({ type: 'task.created', entity: 'task', entityId: 't1', projectId: 'p1', meta: { tagIds: ['tg1'] } });
    logEvent({ type: 'task.created', entity: 'task', entityId: 't2', projectId: 'p1', meta: { tagIds: [] } });
    await flushActivity();
    expect((await queryEvents({ tagId: 'tg1' })).map((e) => e.entityId)).toEqual(['t1']);
  });

  it('nunca lança (fire-and-forget) e é append-only', async () => {
    expect(() =>
      logEvent({ type: 'task.created', entity: 'task', entityId: 't1', projectId: 'p1' }),
    ).not.toThrow();
    await flushActivity();
    expect((await queryEvents({ limit: 1 })).length).toBe(1);
  });

  it('retenção apaga eventos com +90 dias', async () => {
    logEventsBulk([
      { type: 'task.created', entity: 'task', entityId: 'old', projectId: 'p1', at: daysAgo(ACTIVITY_RETENTION_DAYS + 1) },
      { type: 'task.created', entity: 'task', entityId: 'fresh', projectId: 'p1', at: daysAgo(3) },
    ]);
    await flushActivity();
    expect(await countEvents()).toBe(2);
    const cutoff = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 86_400_000).toISOString();
    expect(await pruneActivity(cutoff)).toBe(1);
    expect((await queryEvents()).map((e) => e.entityId)).toEqual(['fresh']);
  });

  it('upgrade v1→v2 preserva dados e cria índices', async () => {
    // Simula banco antigo: cria v1 manualmente, fecha e reabre via getDB (v2).
    const { openDB } = await import('idb');
    const v1 = await openDB('forgeboard', 1, {
      upgrade(db) {
        db.createObjectStore('kv');
        db.createObjectStore('backups');
      },
    });
    await v1.put('kv', { version: 2, projects: [], tasks: [], tags: [] }, 'board');
    v1.close();

    const db = await getDB();
    expect(db.objectStoreNames.contains('activity')).toBe(true);
    expect(db.objectStoreNames.contains('kv')).toBe(true);
    expect(await db.get('kv', 'board')).toMatchObject({ version: 2 });
    db.close();
  });

  it('bulk com milhares de eventos consulta rápido (smoke)', async () => {    const bulk = Array.from({ length: 2000 }, (_, i) => ({
      type: 'task.updated' as const,
      entity: 'task' as const,
      entityId: `t${i % 50}`,
      projectId: i % 2 === 0 ? 'p1' : 'p2',
      meta: { title: `T${i}` },
    }));
    logEventsBulk(bulk);
    await flushActivity();
    expect(await countEvents()).toBe(2000);
    const filtered = await queryEvents({ projectId: 'p1', limit: 500 });
    expect(filtered).toHaveLength(500);
    expect(filtered.every((e) => e.projectId === 'p1')).toBe(true);
  });
});

describe('statusTransitionEvents', () => {
  it('sempre gera moved; completed/reopened só na borda do done', () => {
    const moved = statusTransitionEvents('t1', 'p1', 'T', 'backlog', 'in-progress', []);
    expect(moved.map((e) => e.type)).toEqual(['task.moved']);

    const done = statusTransitionEvents('t1', 'p1', 'T', 'in-progress', 'done', ['tg1']);
    expect(done.map((e) => e.type)).toEqual(['task.moved', 'task.completed']);

    const reopened = statusTransitionEvents('t1', 'p1', 'T', 'done', 'backlog', []);
    expect(reopened.map((e) => e.type)).toEqual(['task.moved', 'task.reopened']);
  });

  it('preenche `at` quando omitido e preserva quando informado', async () => {
    logEventsBulk(statusTransitionEvents('t1', 'p1', 'T', 'backlog', 'done', []));
    await flushActivity();
    const rows = await queryEvents({ types: ['task.moved', 'task.completed'] });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(typeof r.at).toBe('string');
      expect(Number.isNaN(Date.parse(r.at))).toBe(false);
    }
  });
});
