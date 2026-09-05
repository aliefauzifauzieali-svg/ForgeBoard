import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createProject, openProject, resetBoard, waitForPrefsValue } from './helpers';

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('dialog', { name: 'Configurações' })).toBeVisible();
}

test.describe('dados: backup, exportação e preferências', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('exportar gera JSON v2 com etiquetas', async ({ page }) => {
    await createProject(page, 'Projeto Dados');
    await openProject(page, 'Projeto Dados');
    await page.keyboard.press('n');
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await dialog.getByLabel('Título *', { exact: true }).fill('Com tag');
    await dialog.getByLabel('Etiquetas').fill('exportada');
    await dialog.getByLabel('Etiquetas').press('Enter');
    await dialog.getByRole('button', { name: 'Criar tarefa' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar' }).click(),
    ]);
    const path = await download.path();
    const json = JSON.parse(readFileSync(path as string, 'utf8')) as {
      version: number;
      tags: Array<{ name: string }>;
      tasks: Array<{ tagIds: string[] }>;
    };
    expect(json.version).toBe(2);
    expect(json.tags.map((t) => t.name)).toEqual(['exportada']);
    expect(json.tasks[0]?.tagIds).toHaveLength(1);
  });

  test('importar v1 migra etiquetas com aviso', async ({ page }) => {
    const v1 = {
      version: 1,
      projects: [
        {
          id: 'p1',
          name: 'Legado E2E',
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
          title: 'Tarefa legada',
          description: '',
          priority: 'medium',
          status: 'backlog',
          tags: ['migrada'],
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          dueDate: null,
        },
      ],
    };
    writeFileSync('test-results/board-v1-e2e.json', JSON.stringify(v1));
    await page.getByLabel('Selecionar arquivo JSON para importar').setInputFiles('test-results/board-v1-e2e.json');

    const confirm = page.getByRole('dialog', { name: 'Substituir dados?' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(/versão antiga/i)).toBeVisible();
    await confirm.getByRole('button', { name: 'Substituir' }).click();

    await expect(page.getByText('Legado E2E').first()).toBeVisible();
    await openProject(page, 'Legado E2E');
    await expect(page.getByTestId('kanban-column-backlog').getByText('#migrada')).toBeVisible();
  });

  test('backup manual e restauração após excluir', async ({ page }) => {
    await createProject(page, 'Projeto Backup');
    await openSettings(page);
    const settings = page.getByRole('dialog', { name: 'Configurações' });
    await settings.getByRole('button', { name: 'Fazer backup agora' }).click();
    await expect(page.getByText('Backup criado').first()).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Excluir projeto Projeto Backup' }).click();
    await page
      .getByRole('dialog', { name: 'Excluir projeto' })
      .getByRole('button', { name: 'Excluir' })
      .click();
    await expect(page.getByRole('button', { name: 'Projeto Backup', exact: true })).toBeHidden();

    await openSettings(page);
    const settingsAfter = page.getByRole('dialog', { name: 'Configurações' });
    await settingsAfter.getByRole('button', { name: 'Restaurar' }).first().click();
    await page
      .getByRole('dialog', { name: 'Restaurar backup' })
      .getByRole('button', { name: 'Restaurar' })
      .click();
    await expect(page.getByRole('button', { name: 'Projeto Backup', exact: true })).toBeVisible();
  });

  test('tema escuro persiste após reload', async ({ page }) => {
    await openSettings(page);
    await page.getByRole('dialog', { name: 'Configurações' }).getByRole('radio', { name: 'Escuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // Durabilidade das prefs (debounce) antes do reload.
    await waitForPrefsValue(page, 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
