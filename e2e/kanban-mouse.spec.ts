import { expect, test, type Page } from '@playwright/test';
import { openProject, seedBoard } from './helpers';

const SEED = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Mouse E2E',
      description: '',
      color: '#6366f1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Arrastar com mouse',
      description: '',
      priority: 'medium',
      status: 'backlog',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      dueDate: null,
      tags: [],
    },
  ],
};

/** Arrasto real com o mouse (eventos confiáveis do Chromium). */
async function mouseDragCard(page: Page, cardTestId: string, columnTestId: string): Promise<void> {
  const card = page.getByTestId(cardTestId);
  const col = page.getByTestId(columnTestId);
  const from = await card.boundingBox();
  const to = await col.boundingBox();
  if (!from || !to) throw new Error('card ou coluna sem geometria');
  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2;
  const ty = to.y + Math.min(to.height / 2, 160);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 16 });
  await page.mouse.up();
}

test.describe('kanban com mouse (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await seedBoard(page, SEED);
    await openProject(page, 'Mouse E2E');
  });

  test('arrastar o cartão com o mouse move a tarefa de coluna', async ({ page }) => {
    await mouseDragCard(page, 'task-card-t1', 'kanban-column-in-progress');
    await expect(page.getByTestId('kanban-column-in-progress').getByText('Arrastar com mouse')).toBeVisible();
    await expect(page.getByTestId('kanban-column-backlog').getByText('Arrastar com mouse')).toHaveCount(0);
  });

  test('soltar sobre coluna vazia move a tarefa', async ({ page }) => {
    await mouseDragCard(page, 'task-card-t1', 'kanban-column-done');
    await expect(page.getByTestId('kanban-column-done').getByText('Arrastar com mouse')).toBeVisible();
  });

  test('arrastar de volta (Concluído → Backlog) funciona', async ({ page }) => {
    await mouseDragCard(page, 'task-card-t1', 'kanban-column-done');
    await expect(page.getByTestId('kanban-column-done').getByText('Arrastar com mouse')).toBeVisible();
    await mouseDragCard(page, 'task-card-t1', 'kanban-column-backlog');
    await expect(page.getByTestId('kanban-column-backlog').getByText('Arrastar com mouse')).toBeVisible();
  });

  test('cancelar com Escape limpa o destaque da coluna', async ({ page }) => {
    const card = page.getByTestId('task-card-t1');
    const col = page.getByTestId('kanban-column-in-progress');
    const from = await card.boundingBox();
    const to = await col.boundingBox();
    if (!from || !to) throw new Error('card ou coluna sem geometria');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 16 });
    await expect(col).toHaveClass(/touch-drop-target/);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(col).not.toHaveClass(/touch-drop-target/);
    await expect(page.getByTestId('kanban-column-backlog').getByText('Arrastar com mouse')).toBeVisible();
  });

  test('overlay e fantasma são removidos após soltar (cliques voltam)', async ({ page }) => {
    await mouseDragCard(page, 'task-card-t1', 'kanban-column-in-progress');
    await expect(page.getByTestId('kanban-column-in-progress').getByText('Arrastar com mouse')).toBeVisible();
    const leftover = await page.evaluate(() => ({
      overlays: document.querySelectorAll('[data-drag-overlay]').length,
      ghosts: Array.from(document.querySelectorAll('article[aria-hidden="true"]')).length,
      bodyTouchAction: document.body.style.touchAction,
      bodyUserSelect: document.body.style.userSelect,
    }));
    expect(leftover).toEqual({ overlays: 0, ghosts: 0, bodyTouchAction: '', bodyUserSelect: '' });
    // A UI segue interativa: mover pelos botões funciona após o arrasto.
    await page.getByRole('button', { name: 'Mover Arrastar com mouse para a próxima coluna' }).click();
    await expect(page.getByTestId('kanban-column-done').getByText('Arrastar com mouse')).toBeVisible();
  });
});
