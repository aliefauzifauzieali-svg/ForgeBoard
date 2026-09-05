import { devices, expect, test } from '@playwright/test';
import { expectNoSeriousViolations, seedBoard } from './helpers';

test.use({ ...devices['Pixel 7'] });

const SEED = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Site E2E',
      description: '',
      color: '#6366f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Tarefa mobile',
      description: '',
      priority: 'medium',
      status: 'backlog',
      tags: [],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      dueDate: null,
    },
  ],
};

test.describe('acessibilidade mobile (axe)', () => {
  test('dashboard mobile sem violações críticas ou sérias', async ({ page }) => {
    await seedBoard(page, SEED);
    await expect(page.getByText('Site E2E').first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('kanban mobile sem violações críticas ou sérias', async ({ page }) => {
    await seedBoard(page, SEED);
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    // No mobile, navega pelo item da sidebar (o card do dashboard fica sob o drawer).
    await page.getByRole('navigation', { name: 'Projetos' }).getByRole('button', { name: 'Site E2E' }).click();
    await expect(page.getByTestId('kanban-column-backlog')).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
