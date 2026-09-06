// Uso único (Fase 13): renderiza public/favicon.svg em PNG 1024 para `tauri icon`.
// Uso: node scripts/render-icon.mjs <saida.png>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const out = process.argv[2];
if (!out) {
  console.error('Uso: node scripts/render-icon.mjs <saida.png>');
  process.exit(1);
}
const svg = readFileSync('public/favicon.svg', 'utf8').replace(
  '<svg ',
  '<svg width="1024" height="1024" ',
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.locator('svg').screenshot({ path: out });
} finally {
  await browser.close();
}
console.log(`OK: ${out}`);
