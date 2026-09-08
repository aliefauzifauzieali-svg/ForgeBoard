import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const PORT = Number(process.argv[2] ?? 9225);
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
await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
const result = await page.evaluate(async () => {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) return { hasBridge: false };
  const out = {};
  try {
    out.grantedBefore = await invoke('plugin:notification|is_permission_granted');
  } catch (e) {
    out.grantedError = String(e);
  }
  try {
    out.request = await invoke('plugin:notification|request_permission');
  } catch (e) {
    out.requestError = String(e);
  }
  try {
    await invoke('plugin:notification|notify', { title: 'ForgeBoard', body: 'Notificação nativa OK (teste CDP)' });
    out.sent = true;
  } catch (e) {
    out.sent = false;
    out.sendError = String(e);
  }
  try {
    out.grantedAfter = await invoke('plugin:notification|is_permission_granted');
  } catch (e) {
    out.grantedAfterError = String(e);
  }
  return { hasBridge: true, ...out };
});
let frontendVersion = null;
try {
  const raw = readFileSync(`${process.env.APPDATA}\\com.forgeboard.desktop\\frontend\\version.json`, 'utf8');
  frontendVersion = JSON.parse(raw)?.version ?? null;
} catch {
  frontendVersion = 'unreadable';
}
console.log(JSON.stringify({ ok: true, frontendVersion, ...result }));
await browser.close();
