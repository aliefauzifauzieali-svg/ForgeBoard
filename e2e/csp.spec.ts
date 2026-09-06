import { expect, test } from '@playwright/test';
import { createProject, resetBoard } from './helpers';

// Política espelhada em docs/deploy.md. Em dev usa-se 'unsafe-inline' no
// lugar do hash do script inline (o hash vale para o index.html do build).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

test.describe('CSP restritiva', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': CSP },
      });
    });
  });

  test('app funciona com CSP aplicada (sem recursos externos)', async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && m.text().includes('Content Security Policy')) {
        cspErrors.push(m.text());
      }
    });
    await resetBoard(page);
    await createProject(page, 'Projeto CSP');
    expect(cspErrors).toEqual([]);
  });
});
