import { chromium } from '@playwright/test';

const PORT = Number(process.argv[2] ?? 9224);
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
  .find((p) => (p.url() ?? '').includes('forgeboard.localhost'));
if (!page) {
  console.log(JSON.stringify({ ok: false, error: 'app-page-not-found' }));
  process.exit(2);
}
const result = await page.evaluate(async () => {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) return { hasBridge: false };
  try {
    const r = await internals.invoke('plugin:updater|check', {
      headers: undefined, timeout: undefined, proxy: undefined, target: undefined, allowDowngrades: undefined,
    });
    return { hasBridge: true, check: r === null ? null : { version: r.version, currentVersion: r.currentVersion } };
  } catch (e) {
    return { hasBridge: true, error: String(e) };
  }
});
console.log(JSON.stringify({ ok: true, ...result }));
await browser.close();
