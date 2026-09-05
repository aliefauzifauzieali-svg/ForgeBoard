import { expect, test } from '@playwright/test';
import { createProject, createTask, openProject, resetBoard } from './helpers';

test.describe('tarefas', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await createProject(page, 'Projeto Tarefas');
    await openProject(page, 'Projeto Tarefas');
  });

  test('criar tarefa aparece no Backlog', async ({ page }) => {
    await createTask(page, 'Revisar proposta E2E');
    const backlog = page.getByTestId('kanban-column-backlog');
    await expect(backlog.getByText('Revisar proposta E2E')).toBeVisible();
  });

  test('mover tarefa no Kanban para Em andamento', async ({ page }) => {
    await createTask(page, 'Mover-me E2E');
    await page
      .getByRole('button', { name: 'Mover Mover-me E2E para a próxima coluna' })
      .click();
    const inProgress = page.getByTestId('kanban-column-in-progress');
    await expect(inProgress.getByText('Mover-me E2E')).toBeVisible();
  });

  test('editar tarefa altera o título', async ({ page }) => {
    await createTask(page, 'Título antigo E2E');
    await page.getByRole('button', { name: 'Editar tarefa Título antigo E2E' }).click();
    await page.getByLabel('Título *', { exact: true }).fill('Título novo E2E');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Título novo E2E').first()).toBeVisible();
  });
});
