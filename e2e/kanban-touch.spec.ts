import { devices, expect, test, type Page } from '@playwright/test';
import { openProject, seedBoard } from './helpers';

test.use({ ...devices['Pixel 7'] });

const SEED = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Touch E2E',
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
      title: 'Arrastar eu',
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

/** Simula long-press + arrasto por toque via PointerEvents sintéticos. */
async function touchDragCard(page: Page, cardTestId: string, columnTestId: string): Promise<void> {
  await page.evaluate(
    async ([cardId, colId]: [string, string]) => {
      const card = document.querySelector(`[data-testid="${cardId}"]`) as HTMLElement | null;
      const col = document.querySelector(`[data-testid="${colId}"]`) as HTMLElement | null;
      if (!card || !col) throw new Error('card ou coluna ausente');
      col.scrollIntoView({ block: 'center' });
      await new Promise((res) => window.setTimeout(res, 150));
      const r = card.getBoundingClientRect();
      const t = col.getBoundingClientRect();
      const sx = r.left + r.width / 2;
      const sy = r.top + r.height / 2;
      const tx = t.left + t.width / 2;
      const ty = t.top + Math.min(t.height / 2, 160);
      const fire = (type: string, x: number, y: number): void => {
        card.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: 'touch',
            isPrimary: true,
            pointerId: 7,
            clientX: x,
            clientY: y,
          }),
        );
      };
      fire('pointerdown', sx, sy);
      await new Promise((res) => window.setTimeout(res, 600));
      const steps = 8;
      for (let i = 1; i <= steps; i += 1) {
        fire('pointermove', sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps);
        await new Promise((res) => window.setTimeout(res, 30));
      }
      fire('pointerup', tx, ty);
    },
    [cardTestId, columnTestId] as [string, string],
  );
}

test.describe('kanban por toque (long-press)', () => {
  test.beforeEach(async ({ page }) => {
    await seedBoard(page, SEED);
    await openProject(page, 'Touch E2E');
  });

  test('long-press arrasta a tarefa para outra coluna', async ({ page }) => {
    await touchDragCard(page, 'task-card-t1', 'kanban-column-in-progress');
    await expect(page.getByTestId('kanban-column-in-progress').getByText('Arrastar eu')).toBeVisible();
    await expect(page.getByTestId('kanban-column-backlog').getByText('Arrastar eu')).toHaveCount(0);
  });

  test('toque rápido com movimento não inicia arrasto', async ({ page }) => {
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="task-card-t1"]') as HTMLElement | null;
      if (!card) throw new Error('card ausente');
      const r = card.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const fire = (type: string, dx: number, dy: number): void => {
        card.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: 'touch',
            isPrimary: true,
            pointerId: 7,
            clientX: x + dx,
            clientY: y + dy,
          }),
        );
      };
      fire('pointerdown', 0, 0);
      fire('pointermove', 0, 60);
      fire('pointerup', 0, 60);
    });
    await expect(page.getByTestId('kanban-column-backlog').getByText('Arrastar eu')).toBeVisible();
    await expect(page.locator('.touch-drop-target')).toHaveCount(0);
  });
});
