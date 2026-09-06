import { expect, test, type Page } from '@playwright/test';
import { dragChipToDay, openProject, seedBoard } from './helpers';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `yyyy-mm-dd` local (sem deslocamento UTC). */
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const NOW = new Date();
// Alvo garantido no mesmo mês do dia atual (visível sem navegar).
const DELTA = NOW.getDate() <= 25 ? 3 : -3;
const TODAY = isoLocal(NOW);
const TARGET = isoLocal(plusDays(NOW, DELTA));

function seed(dueA: string | null = TODAY) {
  return {
    version: 1,
    projects: [
      {
        id: 'p1',
        name: 'Projeto Cal',
        description: '',
        color: '#6366f1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    tasks: [
      {
        id: 'tA',
        projectId: 'p1',
        title: 'Tarefa com prazo',
        description: '',
        priority: 'high',
        status: 'backlog',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        dueDate: dueA,
        tags: ['cal'],
      },
      {
        id: 'tB',
        projectId: 'p1',
        title: 'Tarefa sem prazo',
        description: '',
        priority: 'low',
        status: 'backlog',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        dueDate: null,
        tags: [],
      },
    ],
  };
}

async function gotoCalendar(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Calendário' }).click();
  await expect(page.getByTestId('calendar-view')).toBeVisible();
}

test.describe('calendário', () => {
  test('mês exibe tarefa no dia do prazo; sem-prazo fica de fora', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await expect(page.getByTestId(`cal-day-${TODAY}`).getByText('Tarefa com prazo')).toBeVisible();
    await expect(page.getByTestId('cal-chip-tB')).toHaveCount(0);
  });

  test('criar tarefa pelo + do dia já traz a data preenchida', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await page.getByTestId(`cal-day-${TARGET}`).getByRole('button', { name: `Criar tarefa em ${TARGET}` }).click();

    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Prazo (opcional)', { exact: true })).toHaveValue(TARGET);
    await dialog.getByLabel('Título *', { exact: true }).fill('Nova pelo calendário');
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByTestId(`cal-day-${TARGET}`).getByText('Nova pelo calendário')).toBeVisible();
  });

  test('clicar no número do dia abre nova tarefa com a data', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await page.getByTestId(`cal-day-${TARGET}`).getByRole('button', { name: `Dia ${TARGET}: criar tarefa` }).click();

    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Prazo (opcional)', { exact: true })).toHaveValue(TARGET);
  });

  test('clicar no chip abre a edição', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await page.getByTestId('cal-chip-tA').click();
    const dialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Título *', { exact: true })).toHaveValue('Tarefa com prazo');
  });

  test('arrastar chip para outro dia remarca o prazo', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await dragChipToDay(page, 'cal-chip-tA', TARGET);
    await expect(page.getByTestId(`cal-day-${TARGET}`).getByText('Tarefa com prazo')).toBeVisible();
    await expect(page.getByTestId(`cal-day-${TODAY}`).getByText('Tarefa com prazo')).toBeHidden();
  });

  test('sincronia kanban → calendário via edição de prazo', async ({ page }) => {
    await seedBoard(page, seed());
    await openProject(page, 'Projeto Cal');
    await page.getByRole('button', { name: 'Editar tarefa Tarefa com prazo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await dialog.getByLabel('Prazo (opcional)', { exact: true }).fill(TARGET);
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
    await gotoCalendar(page);
    await expect(page.getByTestId(`cal-day-${TARGET}`).getByText('Tarefa com prazo')).toBeVisible();
  });

  test('sincronia calendário → kanban após arrastar', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);
    await dragChipToDay(page, 'cal-chip-tA', TARGET);
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await openProject(page, 'Projeto Cal');
    await page.getByRole('button', { name: 'Editar tarefa Tarefa com prazo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await expect(dialog.getByLabel('Prazo (opcional)', { exact: true })).toHaveValue(TARGET);
  });

  test('semana e dia navegam; Hoje retorna', async ({ page }) => {
    await seedBoard(page, seed());
    await gotoCalendar(page);

    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    const weekChip = page.getByTestId('cal-chip-tA');
    await expect(weekChip).toBeVisible();
    await page.getByRole('button', { name: 'Próxima semana' }).click();
    await expect(weekChip).toBeHidden();
    await page.getByRole('button', { name: 'Hoje' }).click();
    await expect(weekChip).toBeVisible();

    await page.getByRole('button', { name: 'Dia', exact: true }).click();
    await expect(page.getByTestId('cal-chip-tA')).toBeVisible();
    await page.getByRole('button', { name: 'Próximo dia' }).click();
    await expect(page.getByTestId('cal-chip-tA')).toBeHidden();
    await page.getByRole('button', { name: 'Hoje' }).click();
    await expect(page.getByTestId('cal-chip-tA')).toBeVisible();
  });

  test('paleta abre o calendário', async ({ page }) => {
    await seedBoard(page, seed());
    await expect(page.getByText('Projeto Cal').first()).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByLabel('Buscar comandos, projetos e tarefas').fill('calendário');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('calendar-view')).toBeVisible();
  });
});
