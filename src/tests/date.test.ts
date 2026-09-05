import { describe, expect, it } from 'vitest';
import { isOverdue, startOfToday, toDateOnly, toDateTime } from '../utils/date';

describe('toDateOnly / toDateTime', () => {
  it('formata datas e tolera inválidas', () => {
    expect(toDateOnly(null)).toBe('—');
    expect(toDateOnly('invalida')).toBe('—');
    expect(toDateOnly('2026-09-05')).toMatch(/05.*2026/);
    expect(toDateTime('invalida')).toBe('—');
    expect(toDateTime('2026-09-05T10:30:00.000Z')).toMatch(/05/);
  });

  it('não desloca o dia em date-only (meio-dia local)', () => {
    // "2026-01-01" puro seria meia-noite UTC (dia anterior no Brasil).
    expect(toDateOnly('2026-01-01')).toMatch(/01.*2026/);
  });
});

describe('isOverdue', () => {
  it('regras de atraso', () => {
    expect(isOverdue(null, 'backlog')).toBe(false);
    expect(isOverdue('2000-01-01', 'done')).toBe(false);
    expect(isOverdue('2000-01-01', 'backlog')).toBe(true);
    expect(isOverdue('2000-01-01', 'in-progress')).toBe(true);
    expect(isOverdue('2999-01-01', 'backlog')).toBe(false);
    expect(isOverdue('invalida', 'backlog')).toBe(false);
  });

  it('prazo hoje ainda não venceu', () => {
    const d = startOfToday();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(isOverdue(iso, 'backlog')).toBe(false);
  });
});
