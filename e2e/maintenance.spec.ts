import { expect, test } from '@playwright/test';
import { createProject, createTask, resetBoard } from './helpers';

test.describe('manutenção', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Projeto Reset');
  });

  test('limpar dados do app apaga tudo e volta às boas-vindas', async ({ page }) => {
    await createTask(page, 'Apagar-me');
    await expect(page.getByText('Apagar-me').first()).toBeVisible();

    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await page.getByRole('button', { name: 'Limpar dados do app' }).click();
    await page
      .getByRole('dialog', { name: 'Limpar dados do app' })
      .getByRole('button', { name: 'Limpar dados' })
      .click();

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible({ timeout: 10_000 });
  });

  test('restaurar fábrica exige confirmação dupla', async ({ page }) => {
    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await page.getByRole('button', { name: 'Restaurar fábrica' }).click();
    await page
      .getByRole('dialog', { name: 'Restaurar fábrica' })
      .getByRole('button', { name: 'Continuar' })
      .click();
    await page
      .getByRole('dialog', { name: 'Confirmar restauração' })
      .getByRole('button', { name: 'Apagar tudo' })
      .click();

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible({ timeout: 10_000 });
  });

  test('limpar cache mantém os dados', async ({ page }) => {
    await createTask(page, 'Manter-me');

    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await page.getByRole('button', { name: 'Limpar cache' }).click();
    await page
      .getByRole('dialog', { name: 'Limpar cache' })
      .getByRole('button', { name: 'Limpar cache', exact: true })
      .click();

    await page.getByText('Manter-me').first().waitFor({ timeout: 10_000 });
  });

  test('reinstalar aparece só no desktop (fora do Tauri fica oculto)', async ({ page }) => {
    await page.getByRole('button', { name: 'Configurações' }).click();
    await page.getByRole('dialog', { name: 'Configurações' }).waitFor();
    await expect(page.getByRole('button', { name: 'Reinstalar o app' })).toHaveCount(0);
  });
});
