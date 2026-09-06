import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * PWA contra o build de produção: manifest, registro do SW, offline,
 * splash e fluxo de atualização com confirmação.
 *
 * Serial: o teste de update rebuilda o `dist` e não pode concorrer
 * com os demais testes deste arquivo.
 */
test.describe.configure({ mode: 'serial' });

test.describe('PWA', () => {
  test('manifest válido com ícones instaláveis', async ({ page, request }) => {
    const res = await request.get('/manifest.json');
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as {
      short_name: string;
      display: string;
      icons: Array<{ src: string; sizes: string }>;
    };
    expect(manifest.short_name).toBe('ForgeBoard');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons) {
      if (icon.sizes === 'any') continue;
      const r = await request.get(`/${icon.src}`);
      expect(r.ok()).toBe(true);
    }
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
  });

  test('service worker registra e controla a página', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 })
      .toBe(true);
  });

  test('splash removido após o boot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    await expect(page.locator('#boot-splash')).toHaveCount(0);
  });

  test('carregamento inicial dentro do orçamento (FCP)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName('first-contentful-paint')[0] as
        | PerformanceEntry
        | undefined;
      return entry?.startTime ?? -1;
    });
    expect(fcp).toBeGreaterThanOrEqual(0);
    expect(fcp).toBeLessThan(8000);
  });

  test('funciona offline após a primeira visita', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    await page.reload();
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
      await expect(page.getByTestId('offline-banner')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test('nova versão notifica e atualiza com confirmação', async ({ page }) => {
    const file = 'index.html';
    // Início auto-regenerativo: remove marcador de execução interrompida, se houver.
    writeFileSync(file, readFileSync(file, 'utf8').replace(/\s*<!-- pwa-update-probe -->\n/, '\n'));
    const original = readFileSync(file, 'utf8');
    const marker = '<!-- pwa-update-probe -->';
    expect(original).not.toContain(marker);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao ForgeBoard' })).toBeVisible();
    // Garante SW ativo E controlando antes de publicar a v2 (senão a v2
    // vira instalação inicial em vez de update com espera).
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 })
      .toBe(true);

    writeFileSync(file, original.replace('</body>', `  ${marker}\n</body>`));
    try {
      execSync('npm run build', { timeout: 180000, stdio: 'pipe' });
      await page.reload();
      // SW novo detectado → toast aguardando confirmação (sem refresh forçado).
      await expect(page.getByText('Nova versão disponível')).toBeVisible({ timeout: 20000 });
      // O clique recarrega a página (plugin); não esperar a navegação.
      await page.getByRole('button', { name: 'Atualizar' }).click({ noWaitAfter: true });
      // Poll tolerante a navegações no meio do caminho (contexto destruído).
      await expect
        .poll(
          async () => {
            try {
              return await page.evaluate((m: string) => document.body.innerHTML.includes(m), marker);
            } catch {
              return false;
            }
          },
          { timeout: 20000 },
        )
        .toBe(true);
    } finally {
      writeFileSync(file, original);
      execSync('npm run build', { timeout: 180000, stdio: 'pipe' });
    }
  });
});
