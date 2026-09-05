import { expect, test } from '@playwright/test';
import { createProject, resetBoard } from './helpers';

test.describe('projetos', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('criar projeto pelo modal', async ({ page }) => {
    await createProject(page, 'Site E2E');
    await expect(page.getByText('Site E2E').first()).toBeVisible();
    await expect(page.getByText(/tarefa/).first()).toBeVisible();
  });

  test('abrir projeto mostra o Kanban com 3 colunas', async ({ page }) => {
    await createProject(page, 'Kanban E2E');
    await page.getByRole('button', { name: 'Abrir projeto Kanban E2E' }).click();
    await expect(page.getByTestId('kanban-column-backlog')).toBeVisible();
    await expect(page.getByTestId('kanban-column-in-progress')).toBeVisible();
    await expect(page.getByTestId('kanban-column-done')).toBeVisible();
  });
});
