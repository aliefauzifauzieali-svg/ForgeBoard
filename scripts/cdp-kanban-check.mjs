/* Verificação de DnD no app desktop real via CDP (temporário, diagnóstico).
 * Uso: node scripts/cdp-kanban-check.mjs [porta]
 * O app deve ter sido aberto com
 *   WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<porta>
 * Sai 0 se a tarefa mudou de coluna, 1 caso contrário.
 */
import { chromium } from '@playwright/test';

const PORT = Number(process.argv[2] ?? 9223);
const APP_URL_EXPECT = 'forgeboard.localhost';
const SEED = {
  version: 1,
  projects: [
    { id: 'p1', name: 'CDP E2E', description: '', color: '#6366f1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ],
  tasks: [
    { id: 't1', projectId: 'p1', title: 'Arrastar no desktop', description: '', priority: 'medium', status: 'backlog', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', dueDate: null, tags: [] },
  ],
};

let browser = null;
for (let i = 0; i < 30; i += 1) {
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (!browser) {
  console.log(JSON.stringify({ ok: false, error: 'cdp-unreachable' }));
  process.exit(2);
}
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => (p.url() ?? '').includes(APP_URL_EXPECT));
if (!page) {
  console.log(JSON.stringify({ ok: false, error: 'app-page-not-found' }));
  process.exit(2);
}

// Seed idêntico ao e2e/helpers.seedBoard.
await page.goto(`http://${APP_URL_EXPECT}/index.html`);
await page.evaluate(
  async ([key, raw]) => {
    window.localStorage.clear();
    await new Promise((resolve) => {
      const req = window.indexedDB.deleteDatabase('forgeboard');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
      window.setTimeout(() => resolve(), 1000);
    });
    window.localStorage.setItem(key, raw);
  },
  ['forgeboard:v1', JSON.stringify(SEED)],
);
await page.reload();
await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });

await page.getByRole('button', { name: 'Abrir projeto CDP E2E' }).click();
await page.getByRole('heading', { name: 'Quadro Kanban' }).waitFor({ timeout: 15000 });

// Contadores de eventos DnD (captura, para provar o mecanismo).
await page.evaluate(() => {
  const log = [];
  window.__dndCounts = log;
  for (const t of ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend']) {
    document.addEventListener(t, () => log.push(t), true);
  }
});

const card = page.getByTestId('task-card-t1');
const col = page.getByTestId('kanban-column-in-progress');
await card.scrollIntoViewIfNeeded();
await col.scrollIntoViewIfNeeded();
await card.scrollIntoViewIfNeeded();
const diag = await page.evaluate(() => {
  const r = document.querySelector('[data-testid="task-card-t1"]')?.getBoundingClientRect();
  return { vw: window.innerWidth, vh: window.innerHeight, scrollY: window.scrollY, card: r && { x: r.x, y: r.y, w: r.width, h: r.height } };
});
const from = await card.boundingBox();
const to = await col.boundingBox();
if (!from || !to) {
  console.log(JSON.stringify({ ok: false, error: 'no-geometry' }));
  process.exit(2);
}
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 16 });
await page.mouse.up();

const result = await page.evaluate(() => {
  const counts = window.__dndCounts ?? [];
  const tally = {};
  for (const t of counts) tally[t] = (tally[t] ?? 0) + 1;
  const el = document.querySelector('[data-testid="task-card-t1"]');
  return { tally, finalCol: el?.closest('section')?.dataset.testid ?? null };
});
const moved = result.finalCol === 'kanban-column-in-progress';
console.log(JSON.stringify({ ok: moved, ...diag, ...result }));
await browser.close();
process.exit(moved ? 0 : 1);
