import { expect, test } from '@playwright/test';
import { resetBoard } from './helpers';

/**
 * Smoke de performance com volume (500 tarefas): boot com migração v1→v2,
 * render e filtro. Limites folgados — rede contra regressões catastróficas.
 */
test.describe('performance com volume', () => {
  test('500 tarefas: dashboard renderiza e filtra', async ({ page }) => {
    await resetBoard(page);
    const built = await page.evaluate(() => {
      const now = new Date().toISOString();
      const projects = [
        { id: 'p1', name: 'Volume', description: '', color: '#6366f1', createdAt: now, updatedAt: now },
      ];
      const tasks = Array.from({ length: 500 }, (_, i) => ({
        id: `t${i}`,
        projectId: 'p1',
        title: `Tarefa ${i} com texto para busca`,
        description: 'x'.repeat(50),
        priority: (['low', 'medium', 'high', 'critical'] as const)[i % 4],
        status: (i % 5 === 0 ? 'done' : i % 3 === 0 ? 'in-progress' : 'backlog') as 'done' | 'in-progress' | 'backlog',
        tags: [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        dueDate: null,
      }));
      window.localStorage.setItem(
        'forgeboard:v1',
        JSON.stringify({ version: 1, projects, tasks }),
      );
      return tasks.length;
    });
    expect(built).toBe(500);
    const t0 = Date.now();
    await page.reload();
    await expect(page.getByText('Volume').first()).toBeVisible({ timeout: 15000 });
    const bootMs = Date.now() - t0;

    const f0 = Date.now();
    await page.getByLabel(/pesquisar tarefas/i).fill('tarefa 499');
    // Escopo à lista (o select "Tarefa vinculada" do timer também contém o título, em <option> oculta).
    const list = page.getByRole('region', { name: /Todas as tarefas/ });
    await expect(list.getByText('Tarefa 499 com texto para busca')).toBeVisible();
    const filterMs = Date.now() - f0;

    console.log(`VOLUME boot=${bootMs}ms filter=${filterMs}ms`);
    expect(bootMs).toBeLessThan(15000);
    expect(filterMs).toBeLessThan(10000);
  });
});
