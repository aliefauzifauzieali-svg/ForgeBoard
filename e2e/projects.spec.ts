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

  test('modelo de projeto preenche e cria tarefas iniciais', async ({ page }) => {
    await page.getByRole('button', { name: 'Novo projeto (P)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo projeto' });
    await dialog.getByRole('radio', { name: 'Trabalho' }).click();
    await expect(dialog.getByLabel('Nome *', { exact: true })).toHaveValue('Trabalho');
    await dialog.getByRole('button', { name: 'Criar projeto' }).click();
    await page.getByRole('button', { name: 'Abrir projeto Trabalho' }).click();
    await expect(page.getByTestId('kanban-column-backlog').getByText('Planejar a semana')).toBeVisible();
  });
});
