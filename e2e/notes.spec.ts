import { expect, test, type Page } from '@playwright/test';
import { resetBoard } from './helpers';

async function openNotes(page: Page): Promise<void> {
  await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Notas', exact: true }).click();
  await page.getByRole('heading', { name: 'Notas' }).waitFor();
}

async function createNote(page: Page, title: string, content: string): Promise<void> {
  await page.getByRole('button', { name: 'Nova nota' }).click();
  await page.getByLabel('Título da nota').fill(title);
  await page.getByLabel('Conteúdo em Markdown').fill(content);
  // Autosave confirma persistência antes de seguir.
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText(/Salvo às/)).toBeVisible();
  await expect(page.getByRole('button', { name: `Abrir nota ${title} no editor` })).toBeVisible();
}

test.describe('notas', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('criar, ver preview ao vivo e persistir após reload', async ({ page }) => {
    await openNotes(page);
    await page.getByRole('button', { name: 'Nova nota' }).click();
    await page.getByLabel('Título da nota').fill('Ideia E2E');
    await page.getByLabel('Conteúdo em Markdown').fill('# Topo\n\n**forte** e `código`');
    const preview = page.getByRole('region', { name: 'Pré-visualização' });
    await expect(preview.getByRole('heading', { name: 'Topo' })).toBeVisible();
    await expect(preview.getByText('forte')).toBeVisible();

    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText(/Salvo às/)).toBeVisible();

    await page.reload();
    await openNotes(page);
    await expect(page.getByRole('button', { name: 'Abrir nota Ideia E2E no editor' })).toBeVisible();
  });

  test('toolbar formata (negrito/itálico/tabela) e mostra contagem', async ({ page }) => {
    await openNotes(page);
    await createNote(page, 'Format E2E', 'base');
    const area = page.getByLabel('Conteúdo em Markdown');
    await area.fill('demo');
    await area.selectText();
    await page.getByRole('button', { name: 'Negrito', exact: true }).click();
    await expect(area).toHaveValue('**demo**');

    await page.getByRole('button', { name: 'Tabela', exact: true }).click();
    await expect(area).toHaveValue(/\| Coluna 1 \| Coluna 2 \|/);
    await expect(page.getByText(/palavras/)).toBeVisible();
    await expect(page.getByText(/min de leitura/)).toBeVisible();
  });

  test('pesquisar filtra por título e etiqueta', async ({ page }) => {
    await openNotes(page);
    await createNote(page, 'Alpha', 'corpo um');
    await page.getByLabel('Etiquetas separadas por vírgula').fill('dev');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await createNote(page, 'Beta', 'corpo dois');

    await page.getByLabel('Pesquisar notas').fill('beta');
    await expect(page.getByRole('button', { name: 'Abrir nota Beta no editor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir nota Alpha no editor' })).toHaveCount(0);
    await page.getByLabel('Pesquisar notas').fill('dev');
    await expect(page.getByRole('button', { name: 'Abrir nota Alpha no editor' })).toBeVisible();
  });

  test('fixar, duplicar, arquivar e excluir', async ({ page }) => {
    await openNotes(page);
    await createNote(page, 'Fixa E2E', 'conteúdo');

    await page.getByRole('button', { name: 'Fixar nota Fixa E2E' }).click();
    await expect(page.getByRole('button', { name: 'Desafixar nota Fixa E2E' })).toBeVisible();

    await page.getByRole('button', { name: 'Duplicar nota' }).click();
    await expect(page.getByRole('button', { name: 'Abrir nota Fixa E2E (cópia) no editor' })).toBeVisible();

    await page.getByRole('button', { name: 'Arquivar nota' }).click();
    await expect(page.getByRole('button', { name: 'Abrir nota Fixa E2E no editor' })).toHaveCount(0);
    await page.getByRole('button', { name: /Arquivadas/ }).click();
    await expect(page.getByRole('button', { name: 'Abrir nota Fixa E2E no editor' })).toBeVisible();

    await page.getByRole('button', { name: 'Abrir nota Fixa E2E no editor' }).click();
    await page.getByRole('button', { name: 'Excluir nota', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Excluir nota' })
      .getByRole('button', { name: 'Excluir' })
      .click();
    await expect(page.getByRole('button', { name: 'Abrir nota Fixa E2E no editor' })).toHaveCount(0);
  });
});
