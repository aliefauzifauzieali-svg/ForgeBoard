import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../services/taskQuery';
import { useUIStore } from '../stores/useUIStore';

function reset(): void {
  useUIStore.setState({
    filters: DEFAULT_FILTERS,
    sortKey: 'createdAt',
    sortDir: 'desc',
  });
}

describe('useUIStore — filtros e ordenação', () => {
  beforeEach(reset);

  it('alterna filtros de status e prioridade', () => {
    useUIStore.getState().toggleStatusFilter('done');
    expect(useUIStore.getState().filters.statuses).toEqual(['done']);
    useUIStore.getState().toggleStatusFilter('done');
    expect(useUIStore.getState().filters.statuses).toEqual([]);

    useUIStore.getState().togglePriorityFilter('high');
    useUIStore.getState().togglePriorityFilter('critical');
    expect(useUIStore.getState().filters.priorities).toEqual(['high', 'critical']);
  });

  it('setFilters mescla e resetFilters restaura tudo', () => {
    useUIStore.getState().setFilters({ search: 'x', showOverdueOnly: true });
    expect(useUIStore.getState().filters.search).toBe('x');
    useUIStore.getState().setSort('title', 'asc');
    useUIStore.getState().resetFilters();
    expect(useUIStore.getState().filters).toEqual(DEFAULT_FILTERS);
    expect(useUIStore.getState().sortKey).toBe('createdAt');
    expect(useUIStore.getState().sortDir).toBe('desc');
  });
});
