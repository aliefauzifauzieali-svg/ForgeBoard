import { expect, test } from '@playwright/test';
import { createProject, createTask, openProject, resetBoard } from './helpers';

test.describe('estatísticas', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Site Stats');
    await openProject(page, 'Site Stats');
    await createTask(page, 'Alpha');
    await createTask(page, 'Beta');
    // Conclui Alpha pelos botões de mover (backlog → em andamento → concluído).
    await page.getByRole('button', { name: 'Mover Alpha para a próxima coluna' }).click();
    await page.getByRole('button', { name: 'Mover Alpha para a próxima coluna' }).click();
  });

  test('resumo, throughput e tabela refletem as ações', async ({ page }) => {
    await page.getByRole('button', { name: 'Estatísticas' }).click();
    await expect(page.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();

    await expect(page.getByText('Lead time', { exact: true })).toBeVisible();
    const table = page.getByRole('table');
    await expect(table.getByText('tarefa concluída')).toBeVisible();
    await expect(table.getByText('Alpha').first()).toBeVisible();
  });

  test('filtro por projeto restringe a tabela', async ({ page }) => {
    await page.getByRole('button', { name: 'Dashboard', exact: true }).first().click();
    await createProject(page, 'Outro');
    await page.getByRole('button', { name: 'Estatísticas' }).click();

    await page.getByLabel('Filtrar por projeto').selectOption({ label: 'Site Stats' });
    const table = page.getByRole('table');
    await expect(table.getByText('Alpha').first()).toBeVisible();
    await expect(table.getByText('Outro')).toBeHidden();
  });

  test('clicar na barra filtra a tabela por dia', async ({ page }) => {
    await page.getByRole('button', { name: 'Estatísticas' }).click();
    await page.getByRole('button', { name: /filtrar por/i }).first().click();
    await expect(page.getByRole('button', { name: /limpar/i })).toBeVisible();
    await page.getByRole('button', { name: /limpar/i }).click();
    await expect(page.getByRole('button', { name: /limpar/i })).toBeHidden();
  });

  test('período de 7 dias renderiza', async ({ page }) => {
    await page.getByRole('button', { name: 'Estatísticas' }).click();
    await page.getByRole('button', { name: '7d', exact: true }).click();
    await expect(page.getByText('Throughput', { exact: false }).first()).toBeVisible();
  });
});
