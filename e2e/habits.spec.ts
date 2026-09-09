import { expect, test, type Page } from '@playwright/test';
import { createProject, createTask, openProject, resetBoard } from './helpers';

async function openHabits(page: Page): Promise<void> {
  await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Hábitos', exact: true }).click();
  await page.getByRole('heading', { name: 'Hábitos' }).waitFor();
}

test.describe('hábitos', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('criar, concluir hoje e persistir após reload', async ({ page }) => {
    await openHabits(page);
    await page.getByRole('button', { name: 'Novo hábito' }).click();
    await page.getByLabel('Nome').fill('Ler E2E');
    await page.getByRole('button', { name: 'Criar hábito' }).click();
    await expect(page.getByText('Ler E2E')).toBeVisible();

    const toggle = page.getByRole('button', { name: 'Concluir Ler E2E hoje' });
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Desmarcar Ler E2E hoje' })).toBeVisible();

    await page.reload();
    await openHabits(page);
    await expect(page.getByRole('button', { name: 'Desmarcar Ler E2E hoje' })).toBeVisible();
  });

  test('widget no dashboard reflete o hábito de hoje', async ({ page }) => {
    await createProject(page, 'Rotina');
    await openHabits(page);
    await page.getByRole('button', { name: 'Novo hábito' }).click();
    await page.getByLabel('Nome').fill('Meditar E2E');
    await page.getByRole('button', { name: 'Criar hábito' }).click();
    await expect(page.getByText('Meditar E2E')).toBeVisible();

    await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
    const widget = page.getByRole('region', { name: 'Hábitos de hoje' });
    await expect(widget.getByText('Meditar E2E')).toBeVisible();
    await widget.getByRole('button', { name: 'Meditar E2E' }).click();
    await expect(widget.getByText('1/1')).toBeVisible();
  });

  test('timer vincula tarefa e mantém após reload', async ({ page }) => {
    await createProject(page, 'Foco');
    await openProject(page, 'Foco');
    await createTask(page, 'Tarefa Foco E2E');
    await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Dashboard', exact: true }).click();

    const select = page.getByLabel('Tarefa vinculada');
    await expect(select).toBeVisible();
    await select.selectOption({ label: 'Tarefa Foco E2E · Foco' });
    await expect(select).not.toHaveValue('');

    await page.reload();
    await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByLabel('Tarefa vinculada')).not.toHaveValue('');
  });
});
