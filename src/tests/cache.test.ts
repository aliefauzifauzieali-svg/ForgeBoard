import { describe, expect, it } from 'vitest';
import { clearAppCache } from '../services/cache';

describe('clearAppCache', () => {
  it('limpa sessionStorage e resolve sem dados por perto', async () => {
    window.sessionStorage.setItem('tmp', '1');
    await expect(clearAppCache()).resolves.toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });
});
