import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../storage/activity';
import {
  activityByBucket,
  leadTimeFromEvents,
  projectProgressSeries,
} from '../services/activityStats';

let n = 0;
function ev(
  type: ActivityEvent['type'],
  entityId: string,
  at: string,
  extra: Partial<ActivityEvent> = {},
): ActivityEvent {
  n += 1;
  return {
    id: `e${n}`,
    type,
    entity: type.startsWith('task') ? 'task' : 'project',
    entityId,
    projectId: 'p1',
    at,
    meta: {},
    ...extra,
  };
}

describe('activityByBucket', () => {
  const events = [
    ev('task.created', 't1', '2026-09-01T10:00:00.000Z'),
    ev('task.created', 't2', '2026-09-02T10:00:00.000Z'),
    ev('task.completed', 't1', '2026-09-02T12:00:00.000Z'),
    ev('task.completed', 't2', '2026-09-05T12:00:00.000Z', { projectId: 'p2' }),
  ];

  it('agrega criadas/concluídas por dia com taxa', () => {
    const out = activityByBucket(events, 'day', 5, new Date(2026, 8, 5));
    expect(out.map((b) => b.label)).toEqual(['1/9', '2/9', '3/9', '4/9', '5/9']);
    expect(out[1]).toMatchObject({ created: 1, completed: 1, rate: 100 });
    expect(out[4]).toMatchObject({ created: 0, completed: 1, rate: null });
  });

  it('filtra por projeto e agrupa por semana', () => {
    const out = activityByBucket(events, 'week', 2, new Date(2026, 8, 6), { projectId: 'p2' });
    expect(out.map((b) => b.completed)).toEqual([0, 1]);
  });
});

describe('projectProgressSeries', () => {
  it('acumula conclusões por projeto ao longo dos dias', () => {
    const events = [
      ev('task.completed', 't1', '2026-09-01T10:00:00.000Z'),
      ev('task.completed', 't2', '2026-09-03T10:00:00.000Z'),
      ev('task.completed', 't9', '2026-09-02T10:00:00.000Z', { projectId: 'p2' }),
    ];
    const [s1, s2] = projectProgressSeries(
      events,
      [
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ],
      3,
      new Date(2026, 8, 3),
    );
    expect(s1?.points.map((p) => p.cumulative)).toEqual([1, 1, 2]);
    expect(s2?.points.map((p) => p.cumulative)).toEqual([0, 1, 1]);
  });
});

describe('leadTimeFromEvents', () => {
  it('une criação e conclusão por entidade', () => {
    const events = [
      ev('task.created', 't1', '2026-09-01T00:00:00.000Z'),
      ev('task.completed', 't1', '2026-09-03T00:00:00.000Z'),
      ev('task.created', 't2', '2026-09-01T00:00:00.000Z'),
      ev('task.completed', 't2', '2026-09-05T00:00:00.000Z'),
      ev('task.completed', 't3', '2026-09-05T00:00:00.000Z'), // sem criação: ignorada
    ];
    expect(leadTimeFromEvents(events)).toEqual({ averageDays: 3, completed: 2 });
    expect(leadTimeFromEvents([])).toEqual({ averageDays: null, completed: 0 });
  });
});
