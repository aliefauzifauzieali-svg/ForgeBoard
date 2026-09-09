import { describe, expect, it } from 'vitest';
import { PROJECT_TEMPLATES, templateDueDate } from '../services/projectTemplates';

describe('projectTemplates', () => {
  it('toda template tem id/nome únicos e tarefas válidas', () => {
    const ids = PROJECT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PROJECT_TEMPLATES) {
      expect(t.name.trim().length).toBeGreaterThan(0);
      for (const task of t.tasks) {
        expect(task.title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('templateDueDate soma dias ou retorna null', () => {
    const now = new Date(2026, 8, 6); // 6 set 2026 (local)
    expect(templateDueDate(undefined, now)).toBeNull();
    expect(templateDueDate(0, now)).toBe('2026-09-06');
    expect(templateDueDate(3, now)).toBe('2026-09-09');
  });
});
