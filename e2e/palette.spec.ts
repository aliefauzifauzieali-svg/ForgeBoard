import { expect, test, type Page } from '@playwright/test';
import { createProject, createTask, openProject, resetBoard } from './helpers';

async function openPalette(page: Page): Promise<void> {
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByTestId('command-palette')).toBeVisible();
}

function paletteSearch(page: Page): ReturnType<Page['getByLabel']> {
  return page.getByLabel('Buscar comandos, projetos e tarefas');
}

test.describe('paleta de comandos', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('buscar tarefa e abrir edição com Enter', async ({ page }) => {
    await createProject(page, 'Site Paleta');
    await openProject(page, 'Site Paleta');
    await createTask(page, 'Revisar proposta Paleta');
    await openPalette(page);

    await paletteSearch(page).fill('proposta');
    await expect(page.getByRole('option', { name: /revisar proposta paleta/i })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Editar tarefa' })).toBeVisible();
  });

  test('criar tarefa pelo comando da paleta', async ({ page }) => {
    await createProject(page, 'Site Paleta');
    await openProject(page, 'Site Paleta');
    await openPalette(page);

    await paletteSearch(page).fill('nova tarefa');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Título *', { exact: true }).fill('Tarefa via paleta');
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByText('Tarefa via paleta').first()).toBeVisible();
  });

  test('navegar para projeto pela paleta', async ({ page }) => {
    await createProject(page, 'Alfa');
    await createProject(page, 'Beta');
    await openPalette(page);

    await paletteSearch(page).fill('beta');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Quadro Kanban' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Beta' })).toBeVisible();
  });

  test('excluir tarefa e desfazer pelo toast', async ({ page }) => {
    await createProject(page, 'Site Undo');
    await openProject(page, 'Site Undo');
    await createTask(page, 'Restaurar-me');
    await page.getByRole('button', { name: 'Editar tarefa Restaurar-me' }).hover();

    await page.getByRole('button', { name: 'Excluir tarefa Restaurar-me' }).click();
    await page
      .getByRole('dialog', { name: 'Excluir tarefa' })
      .getByRole('button', { name: 'Excluir' })
      .click();
    const backlog = page.getByTestId('kanban-column-backlog');
    await expect(backlog.getByText('Restaurar-me')).toBeHidden();

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(backlog.getByText('Restaurar-me')).toBeVisible();
  });

  test('ctrl+z desfaz a criação após fechar o modal', async ({ page }) => {
    await createProject(page, 'Site Undo');
    await openProject(page, 'Site Undo');
    await createTask(page, 'Temporária');
    await page.keyboard.press('ControlOrMeta+z');
    await expect(page.getByText('Temporária')).toBeHidden();
  });

  test('atalho ? abre o diálogo de atalhos', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeHidden();
  });
});
