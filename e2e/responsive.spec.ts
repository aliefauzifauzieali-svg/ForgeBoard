import { devices, expect, test } from '@playwright/test';
import { createTask, openProject, resetBoard } from './helpers';

test.use({ ...devices['Pixel 7'] });

test.describe('responsivo (mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('navegação inferior visível e sidebar recolhível', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toBeVisible();

    const sidebar = page.getByRole('complementary', { name: 'Navegação principal' });
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(sidebar).toHaveClass(/(?:^|\s)translate-x-0(?:\s|$)/);

    await page.getByRole('button', { name: 'Novo projeto (P)' }).click();
    await page.getByLabel('Nome *', { exact: true }).fill('Mobile E2E');
    await page
      .getByRole('dialog', { name: 'Novo projeto' })
      .getByRole('button', { name: 'Criar projeto' })
      .click();
    await expect(page.getByText('Mobile E2E').first()).toBeVisible();
  });

  test('kanban empilha na vertical com as 3 colunas visíveis', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Novo projeto (P)' }).click();
    await page.getByLabel('Nome *', { exact: true }).fill('Quadro Mobile');
    await page
      .getByRole('dialog', { name: 'Novo projeto' })
      .getByRole('button', { name: 'Criar projeto' })
      .click();
    await openProject(page, 'Quadro Mobile');
    await createTask(page, 'Tarefa mobile');

    // Em 412px as colunas empilham: todas visíveis sem rolagem horizontal.
    await expect(page.getByTestId('kanban-column-backlog')).toBeVisible();
    await expect(page.getByTestId('kanban-column-in-progress')).toBeVisible();
    await expect(page.getByTestId('kanban-column-done')).toBeVisible();
    const scrollable = await page
      .getByRole('region', { name: /quadro kanban/i })
      .evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrollable).toBe(false);
  });

  test('mover tarefa pelos botões cima/baixo no mobile', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Novo projeto (P)' }).click();
    await page.getByLabel('Nome *', { exact: true }).fill('Mover Mobile');
    await page
      .getByRole('dialog', { name: 'Novo projeto' })
      .getByRole('button', { name: 'Criar projeto' })
      .click();
    await openProject(page, 'Mover Mobile');
    await createTask(page, 'Mover eu');

    await page.getByRole('button', { name: 'Mover Mover eu para a próxima coluna' }).click();
    await expect(
      page.getByTestId('kanban-column-in-progress').getByText('Mover eu'),
    ).toBeVisible();
  });
});
