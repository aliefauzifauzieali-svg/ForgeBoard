import { expect, test } from '@playwright/test';
import { resetBoard } from './helpers';

test.use({ reducedMotion: 'reduce' });

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await resetBoard(page);
  });

  test('animações desabilitadas com prefers-reduced-motion', async ({ page }) => {
    const durations = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'animate-fade-up';
      document.body.appendChild(el);
      const d = getComputedStyle(el).animationDuration;
      el.remove();
      const t = document.createElement('div');
      t.className = 'transition';
      document.body.appendChild(t);
      const td = getComputedStyle(t).transitionDuration;
      t.remove();
      return { animationDuration: d, transitionDuration: td };
    });
    // getComputedStyle serializa 0.01ms como "1e-05s": compara numericamente.
    const toMs = (cssTime: string): number => {
      const value = Number.parseFloat(cssTime);
      return cssTime.trim().endsWith('ms') ? value : value * 1000;
    };
    expect(toMs(durations.animationDuration)).toBeLessThanOrEqual(0.02);
    expect(toMs(durations.transitionDuration)).toBeLessThanOrEqual(0.02);
  });
});
