import { expect, test } from '@playwright/test';
import { createProject, createTask, resetBoard } from './helpers';

test.describe('manutenção', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Projeto Reset');
  });

  test('restaurar padrão apaga tudo e volta às boas-vindas', async ({ page }) => {
    await createTask(page, 'Apagar-me');
    await expect(page.getByText('Apagar-me').first()).toBeVisible();

    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await page.getByRole('button', { name: 'Restaurar padrão' }).click();
    await page
      .getByRole('dialog', { name: 'Restaurar padrão' })
      .getByRole('button', { name: 'Apagar tudo' })
      .click();

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible({ timeout: 10_000 });
  });

  test('reinstalar aparece só no desktop (fora do Tauri fica oculto)', async ({ page }) => {
    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await expect(page.getByRole('button', { name: 'Reinstalar o app' })).toHaveCount(0);
  });
});
