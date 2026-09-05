import { expect, test, type Page } from '@playwright/test';
import { createProject, createTask, openProject, resetBoard } from './helpers';

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('dialog', { name: 'Configurações' })).toBeVisible();
}

test.describe('etiquetas', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Site Tags');
  });

  test('criar etiqueta no autocomplete e ver no cartão', async ({ page }) => {
    await openProject(page, 'Site Tags');
    await page.keyboard.press('n');
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await dialog.getByLabel('Título *', { exact: true }).fill('Com etiqueta');
    await dialog.getByLabel('Etiquetas').fill('frontend');
    await dialog.getByLabel('Etiquetas').press('Enter');
    await expect(dialog.getByText('frontend').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByTestId('kanban-column-backlog').getByText('#frontend')).toBeVisible();
  });

  test('renomear etiqueta reflete nas tarefas', async ({ page }) => {
    await openProject(page, 'Site Tags');
    await createTask(page, 'Tarefa velha');
    await page.getByRole('button', { name: 'Editar tarefa Tarefa velha' }).click();
    const taskDialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await taskDialog.getByLabel('Etiquetas').fill('antiga');
    await taskDialog.getByLabel('Etiquetas').press('Enter');
    await taskDialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('navigation', { name: 'Projetos' }).getByRole('button', { name: 'Dashboard' }).click();

    await openSettings(page);
    const settings = page.getByRole('dialog', { name: 'Configurações' });
    await settings.getByRole('button', { name: 'Renomear etiqueta antiga' }).click();
    await settings.getByLabel('Renomear etiqueta antiga').fill('nova-nome');
    await settings.getByRole('button', { name: 'Salvar' }).click();
    await expect(settings.getByText('nova-nome')).toBeVisible();
    await page.keyboard.press('Escape');

    await openProject(page, 'Site Tags');
    await expect(page.getByTestId('kanban-column-backlog').getByText('#nova-nome')).toBeVisible();
  });

  test('excluir etiqueta remove dos cartões', async ({ page }) => {
    await openProject(page, 'Site Tags');
    await createTask(page, 'Tarefa X');
    await page.getByRole('button', { name: 'Editar tarefa Tarefa X' }).click();
    const taskDialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await taskDialog.getByLabel('Etiquetas').fill('remover-me');
    await taskDialog.getByLabel('Etiquetas').press('Enter');
    await taskDialog.getByRole('button', { name: 'Salvar alterações' }).click();

    await openSettings(page);
    const settings = page.getByRole('dialog', { name: 'Configurações' });
    await settings.getByRole('button', { name: 'Excluir etiqueta remover-me' }).click();
    await page
      .getByRole('dialog', { name: 'Excluir etiqueta' })
      .getByRole('button', { name: 'Excluir' })
      .click();
    await expect(settings.getByText('remover-me')).toBeHidden();
  });
});
