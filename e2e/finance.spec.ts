import { expect, test, type Page } from '@playwright/test';
import { createProject, resetBoard } from './helpers';

async function openFinance(page: Page): Promise<void> {
  await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Economia', exact: true }).click();
  await page.getByRole('heading', { name: 'Economia' }).waitFor();
}

async function createTransaction(
  page: Page,
  opts: { tipo: 'Receita' | 'Despesa'; valor: string; descricao: string; categoria: string; meta?: string },
): Promise<void> {
  await page.getByRole('button', { name: 'Nova transação' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova transação' });
  await dialog.getByRole('button', { name: opts.tipo, exact: true }).click();
  await dialog.getByLabel('Valor (R$)').fill(opts.valor);
  await dialog.getByLabel('Descrição').fill(opts.descricao);
  await dialog.getByLabel('Categoria').selectOption({ label: opts.categoria });
  if (opts.meta) await dialog.getByLabel('Meta (opcional)').selectOption({ label: opts.meta });
  await dialog.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText(opts.descricao)).toBeVisible();
}

test.describe('economia', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
    await page.on('dialog', (d) => d.accept());
  });

  test('criar despesa atualiza saldo e gráfico por categoria', async ({ page }) => {
    await openFinance(page);
    await createTransaction(page, { tipo: 'Despesa', valor: '49,90', descricao: 'Mercado E2E', categoria: 'Alimentação' });

    const summary = page.getByRole('region', { name: 'Resumo do mês' });
    await expect(summary.getByText('R$ 49,90', { exact: true })).toBeVisible();
    await expect(summary.getByText('-R$ 49,90', { exact: true })).toBeVisible();
    await expect(page.getByText('Alimentação').first()).toBeVisible();
  });

  test('filtrar por tipo e excluir transação', async ({ page }) => {
    await openFinance(page);
    await createTransaction(page, { tipo: 'Despesa', valor: '20,00', descricao: 'Lanche E2E', categoria: 'Alimentação' });
    await createTransaction(page, { tipo: 'Receita', valor: '100,00', descricao: 'Bico E2E', categoria: 'Freelance' });

    await page.getByRole('button', { name: 'Receitas', exact: true }).click();
    await expect(page.getByText('Bico E2E')).toBeVisible();
    await expect(page.getByText('Lanche E2E')).toHaveCount(0);

    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    await page.getByRole('button', { name: 'Excluir transação Lanche E2E' }).click();
    await expect(page.getByText('Lanche E2E')).toHaveCount(0);
  });

  test('meta recebe aporte via transação vinculada e persiste', async ({ page }) => {
    await openFinance(page);
    await page.getByRole('button', { name: 'Nova meta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Viagem E2E');
    await page.getByLabel('Valor alvo (R$)').fill('1.000,00');
    await page.getByRole('button', { name: 'Criar meta' }).click();
    await expect(page.getByText('Viagem E2E')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Progresso da meta Viagem E2E' })).toHaveAttribute('aria-valuenow', '0');

    await createTransaction(page, { tipo: 'Receita', valor: '200,00', descricao: 'Aporte E2E', categoria: 'Freelance', meta: 'Viagem E2E' });
    await expect(page.getByRole('progressbar', { name: 'Progresso da meta Viagem E2E' })).toHaveAttribute('aria-valuenow', '20');

    await page.reload();
    await openFinance(page);
    await expect(page.getByRole('progressbar', { name: 'Progresso da meta Viagem E2E' })).toHaveAttribute('aria-valuenow', '20');
  });

  test('widget no dashboard mostra saldo e meta', async ({ page }) => {
    await createProject(page, 'Grana');
    await openFinance(page);
    await page.getByRole('button', { name: 'Nova meta' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Meta Widget E2E');
    await page.getByLabel('Valor alvo (R$)').fill('500,00');
    await page.getByRole('button', { name: 'Criar meta' }).click();
    await createTransaction(page, { tipo: 'Despesa', valor: '30,00', descricao: 'Gasto Widget E2E', categoria: 'Lazer' });

    await page.getByRole('complementary', { name: 'Navegação principal' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
    const widget = page.getByRole('region', { name: 'Resumo financeiro' });
    await expect(widget.getByText('Meta Widget E2E')).toBeVisible();
    await expect(widget.getByText(/Lazer/)).toBeVisible();
  });
});
