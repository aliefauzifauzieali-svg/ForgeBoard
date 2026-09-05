import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openProject, seedBoard } from './helpers';

const SEED = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Site E2E',
      description: 'Descrição do projeto',
      color: '#6366f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Tarefa atrasada',
      description: 'Detalhes importantes',
      priority: 'high',
      status: 'backlog',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      dueDate: '2000-01-01',
      tags: ['site', 'urgente'],
    },
    {
      id: 't2',
      projectId: 'p1',
      title: 'Tarefa em andamento',
      description: '',
      priority: 'medium',
      status: 'in-progress',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      dueDate: null,
      tags: [],
    },
    {
      id: 't3',
      projectId: 'p1',
      title: 'Tarefa concluída',
      description: '',
      priority: 'low',
      status: 'done',
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      dueDate: null,
      tags: ['docs'],
    },
  ],
};

/** Falha se houver violações axe de impacto crítico ou sério. */
async function expectNoSeriousViolations(page: Page): Promise<void> {
  // Espera animações de entrada terminarem (opacidade 1): sem isso o axe
  // mede contraste no meio do fade e gera falsos positivos.
  await page.waitForFunction(() => {
    const animated = Array.from(document.querySelectorAll('.animate-fade-up, .animate-fade-in'));
    return animated.every((el) => getComputedStyle(el).opacity === '1');
  });
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${String(n.html).slice(0, 140)}`),
    }));
  expect(bad).toEqual([]);
}

test.describe('acessibilidade (axe)', () => {
  test('dashboard sem violações críticas ou sérias', async ({ page }) => {
    await seedBoard(page, SEED);
    await expect(page.getByText('Site E2E').first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('kanban e modal de tarefa sem violações críticas ou sérias', async ({ page }) => {
    await seedBoard(page, SEED);
    await openProject(page, 'Site E2E');
    await expectNoSeriousViolations(page);

    await page.keyboard.press('n');
    await expect(page.getByRole('dialog', { name: 'Nova tarefa' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('paleta de comandos sem violações críticas ou sérias', async ({ page }) => {
    await seedBoard(page, SEED);
    await expect(page.getByText('Site E2E').first()).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
