import { expect, test, type Page } from '@playwright/test';
import { resetBoard } from './helpers';

async function openNotes(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Notas', exact: true }).click();
  await page.getByRole('heading', { name: 'Notas' }).waitFor();
}

test.describe('notas', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('criar, visualizar preview e excluir nota', async ({ page }) => {
    await openNotes(page);
    await page.getByRole('button', { name: 'Nova nota' }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar nota' });
    await dialog.getByLabel('Título', { exact: true }).fill('Ideia E2E');
    await dialog.getByLabel('Conteúdo (Markdown)', { exact: true }).fill('# Topo\n\n**forte**');
    await dialog.getByRole('button', { name: 'Visualizar' }).click();
    await expect(dialog.getByRole('region', { name: 'Pré-visualização' }).getByRole('heading', { name: 'Topo' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Concluir' }).click();
    await expect(page.getByTestId(/note-card-/).getByText('Ideia E2E')).toBeVisible();

    await page.getByRole('button', { name: 'Excluir nota Ideia E2E' }).click();
    await page
      .getByRole('dialog', { name: 'Excluir nota' })
      .getByRole('button', { name: 'Excluir' })
      .click();
    await expect(page.getByText('Ideia E2E')).toHaveCount(0);
  });

  test('pesquisar filtra por título e etiqueta', async ({ page }) => {
    await openNotes(page);
    for (const [title, tags] of [['Alpha', 'dev'], ['Beta', 'casa']] as Array<[string, string]>) {
      await page.getByRole('button', { name: 'Nova nota' }).click();
      const dialog = page.getByRole('dialog', { name: 'Editar nota' });
      await dialog.getByLabel('Título', { exact: true }).fill(title);
      await dialog.getByLabel('Etiquetas separadas por vírgula').fill(tags);
      await dialog.getByRole('button', { name: 'Concluir' }).click();
    }
    await page.getByLabel('Pesquisar notas').fill('beta');
    await expect(page.getByText('Beta').first()).toBeVisible();
    await expect(page.getByText('Alpha')).toHaveCount(0);
    await page.getByLabel('Pesquisar notas').fill('dev');
    await expect(page.getByText('Alpha').first()).toBeVisible();
  });
});
