import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../src/utils/constants';
import { createProject, createTask, openProject, resetBoard, waitForTaskPersisted } from './helpers';

test.describe('persistência', () => {
  test('fechar e reabrir mantém projetos e tarefas', async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Persistência E2E');
    await openProject(page, 'Persistência E2E');
    await createTask(page, 'Lembrar de mim E2E');
    // Durabilidade antes do reload (IDB é assíncrono).
    await waitForTaskPersisted(page, 'Lembrar de mim E2E');

    // Simula fechar e reabrir o navegador: reload limpo do app.
    // O boot restaura a última visão (projeto) ou cai no dashboard.
    await page.reload();
    await expect(
      page
        .getByRole('heading', { name: 'Quadro Kanban' })
        .or(page.getByRole('button', { name: 'Abrir projeto Persistência E2E' })),
    ).toBeVisible({ timeout: 10000 });
    const openBtn = page.getByRole('button', { name: 'Abrir projeto Persistência E2E' });
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await expect(page.getByRole('heading', { name: 'Quadro Kanban' })).toBeVisible();
    }
    await expect(page.getByText('Lembrar de mim E2E').first()).toBeVisible();
  });

  test('dados inválidos geram quarentena com opção de recuperação', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => {
      window.localStorage.clear();
      const req = window.indexedDB.deleteDatabase('forgeboard');
      req.onsuccess = () => {};
      req.onerror = () => {};
      req.onblocked = () => {};
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          projects: [
            {
              id: 'p1',
              name: '',
              description: '',
              color: '#6366f1',
              createdAt: 'invalida',
              updatedAt: 'invalida',
            },
          ],
          tasks: [],
        }),
      );
    }, STORAGE_KEY);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    const banner = page.getByTestId('quarantine-banner');
    await expect(banner).toBeVisible();
    await page.getByRole('button', { name: /descartar/i }).click();
    await expect(banner).toBeHidden();
  });
});
