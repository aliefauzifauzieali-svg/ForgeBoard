/**
 * Captura screenshots reais para o README (`docs/screenshots/`).
 *
 * Pré-requisito: `npm run build` (fotografa o `preview` de produção).
 * Uso: `node scripts/capture-screenshots.mjs`
 * Requer Chromium do Playwright (`npm run test:e2e:install`).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const OUT = new URL('../docs/screenshots/', import.meta.url);
mkdirSync(OUT, { recursive: true });

function iso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
const isoDateTime = (d) => `${iso(d)}T10:00:00.000Z`;

const SEED = {
  version: 1,
  projects: [
    {
      id: 'p1',
      name: 'Lançamento do site',
      description: 'Novo site institucional com blog.',
      color: '#6366f1',
      createdAt: isoDateTime(daysAgo(20)),
      updatedAt: isoDateTime(daysAgo(1)),
    },
  ],
  tasks: [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Definir identidade visual',
      description: '',
      priority: 'medium',
      status: 'done',
      tags: ['design'],
      createdAt: isoDateTime(daysAgo(12)),
      updatedAt: isoDateTime(daysAgo(9)),
      dueDate: null,
    },
    {
      id: 't2',
      projectId: 'p1',
      title: 'Escrever página sobre',
      description: '',
      priority: 'high',
      status: 'in-progress',
      tags: ['conteúdo'],
      createdAt: isoDateTime(daysAgo(8)),
      updatedAt: isoDateTime(daysAgo(1)),
      dueDate: iso(daysAgo(-4)),
    },
    {
      id: 't3',
      projectId: 'p1',
      title: 'Publicar primeiro post',
      description: '',
      priority: 'low',
      status: 'backlog',
      tags: ['blog'],
      createdAt: isoDateTime(daysAgo(2)),
      updatedAt: isoDateTime(daysAgo(2)),
      dueDate: iso(daysAgo(-9)),
    },
  ],
};

function seedLocalStorage(data) {
  window.localStorage.clear();
  window.localStorage.setItem('forgeboard:v1', JSON.stringify(data));
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* aguardando */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('preview não subiu');
}

const server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
});
try {
  await waitForServer(`${BASE}/`);
  const browser = await chromium.launch();
  try {
    async function shot(name, setup, contextOptions = {}, shotOptions = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
      await context.addInitScript(seedLocalStorage, SEED);
      const page = await context.newPage();
      await page.goto(`${BASE}/`);
      await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 15000 });
      await setup(page);
      await page.waitForTimeout(900);
      await page.screenshot({ path: fileURLToPath(new URL(name, OUT)), ...shotOptions });
      console.log(`ok: docs/screenshots/${name}`);
      await context.close();
    }

    await shot('dashboard.png', async () => {});
    await shot('notes.png', async (page) => {
      await page.getByRole('button', { name: 'Notas', exact: true }).click();
      await page.getByRole('heading', { name: 'Notas' }).waitFor();
      await page.getByRole('button', { name: 'Nova nota' }).click();
      await page.getByLabel('Título da nota').fill('Ideias para o lançamento');
      await page
        .getByLabel('Conteúdo em Markdown')
        .fill('# Roteiro\n\n- [ ] Definir pauta\n- [ ] Gravar demo\n\n**Foco** em `performance`.\n\n> Feito é melhor que perfeito.');
      await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    });
    await shot('habits.png', async (page) => {
      await page.getByRole('button', { name: 'Hábitos', exact: true }).click();
      await page.getByRole('heading', { name: 'Hábitos' }).waitFor();
      await page.getByRole('button', { name: 'Novo hábito' }).click();
      await page.getByLabel('Nome').fill('Ler 20 páginas');
      await page.getByRole('button', { name: 'Criar hábito' }).click();
      await page.getByText('Ler 20 páginas').waitFor();
    });
    await shot('finance.png', async (page) => {
      await page.getByRole('button', { name: 'Economia', exact: true }).click();
      await page.getByRole('heading', { name: 'Economia' }).waitFor();
      for (const [tipo, valor, desc, cat] of [
        ['Despesa', '49,90', 'Supermercado', 'Alimentação'],
        ['Receita', '2500,00', 'Salário', 'Salário'],
      ]) {
        await page.getByRole('button', { name: 'Nova transação' }).click();
        const dialog = page.getByRole('dialog', { name: 'Nova transação' });
        await dialog.getByRole('button', { name: tipo, exact: true }).click();
        await dialog.getByLabel('Valor (R$)').fill(valor);
        await dialog.getByLabel('Descrição').fill(desc);
        await dialog.getByLabel('Categoria').selectOption({ label: cat });
        await dialog.getByRole('button', { name: 'Adicionar' }).click();
        await page.getByRole('list', { name: 'Transações do mês' }).getByText(desc, { exact: true }).waitFor();
      }
    });
    await shot('focus.png', async (page) => {
      await page.getByRole('heading', { name: 'Modo Foco' }).scrollIntoViewIfNeeded();
    });
    await shot('settings.png', async (page) => {
      await page.getByRole('button', { name: 'Configurações' }).click();
      await page.getByRole('heading', { name: 'Manutenção' }).scrollIntoViewIfNeeded();
    });
    await shot('kanban.png', async (page) => {
      await page.getByRole('button', { name: 'Abrir projeto Lançamento do site' }).click();
      await page.getByTestId('kanban-column-done').waitFor();
    });
    await shot('calendar.png', async (page) => {
      await page.getByRole('button', { name: 'Calendário' }).click();
      await page.getByTestId('calendar-view').waitFor();
    });
    await shot(
      'stats.png',
      async (page) => {
        await page.getByRole('button', { name: 'Abrir projeto Lançamento do site' }).click();
        await page.getByRole('button', { name: 'Mover Escrever página sobre para a próxima coluna' }).click();
        await page.getByRole('button', { name: 'Estatísticas' }).click();
        await page.getByRole('heading', { name: 'Estatísticas' }).waitFor();
      },
    );
    await shot(
      'dark.png',
      async () => {},
      { colorScheme: 'dark' },
    );
    await shot(
      'mobile.png',
      async () => {},
      { ...devices['Pixel 7'] },
      { fullPage: false },
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
