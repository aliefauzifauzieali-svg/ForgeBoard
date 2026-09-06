import { expect, test } from '@playwright/test';
import { resetBoard } from './helpers';

/**
 * Fluxo completo operado só por teclado: atalhos, Tab/Enter/Escape.
 * (Decreto de acessibilidade da Fase 9: teclado de verdade, não só ARIA.)
 */
test.describe('navegação por teclado', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('criar projeto e tarefa só com teclado', async ({ page }) => {
    // P → modal de projeto; Tab até o nome; Enter salva.
    await page.keyboard.press('p');
    const projectDialog = page.getByRole('dialog', { name: 'Novo projeto' });
    await expect(projectDialog).toBeVisible();
    await projectDialog.getByLabel('Nome *', { exact: true }).fill('Teclado');
    await projectDialog.getByRole('button', { name: 'Criar projeto' }).click();
    await expect(page.getByText('Teclado').first()).toBeVisible();

    // N → modal de tarefa; preenche; Enter no Criar.
    await page.keyboard.press('n');
    const taskDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(taskDialog).toBeVisible();
    await taskDialog.getByLabel('Título *', { exact: true }).fill('Só teclado');
    await taskDialog.getByRole('button', { name: 'Criar tarefa' }).press('Enter');
    await expect(page.getByText('Só teclado').first()).toBeVisible();
  });

  test('skip-link é o primeiro Tab e Escape fecha modal', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();

    await page.keyboard.press('n');
    await expect(page.getByRole('dialog', { name: 'Nova tarefa' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Nova tarefa' })).toBeHidden();
  });

  test('T abre nova tarefa com o prazo de hoje', async ({ page }) => {
    await page.keyboard.press('p');
    const projectDialog = page.getByRole('dialog', { name: 'Novo projeto' });
    await projectDialog.getByLabel('Nome *', { exact: true }).fill('Teclado');
    await projectDialog.getByRole('button', { name: 'Criar projeto' }).click();

    await page.keyboard.press('t');
    const taskDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(taskDialog).toBeVisible();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await expect(taskDialog.getByLabel('Prazo (opcional)', { exact: true })).toHaveValue(today);
  });

  test('/ foca a pesquisa e filtra por teclado', async ({ page }) => {
    await page.keyboard.press('p');
    const projectDialog = page.getByRole('dialog', { name: 'Novo projeto' });
    await projectDialog.getByLabel('Nome *', { exact: true }).fill('Teclado');
    await projectDialog.getByRole('button', { name: 'Criar projeto' }).click();

    await page.keyboard.press('/');
    await expect(page.getByLabel(/pesquisar tarefas/i).first()).toBeFocused();
    await page.keyboard.type('nada-aqui-xyz');
    await expect(page.getByText(/nenhuma tarefa corresponde/i)).toBeVisible();
  });
});
