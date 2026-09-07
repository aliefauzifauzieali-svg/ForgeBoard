// Uso único (Fase 13): renderiza public/favicon.svg em PNG 1024 para `tauri icon`.
// Fundo transparente garantido via omitBackground + clip (element screenshot
// sozinho herdava o branco da página e gerava cantos opacos).
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
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  const box = await page.locator('svg').boundingBox();
  if (!box) throw new Error('SVG sem bounding box');
  await page.screenshot({ path: out, omitBackground: true, clip: box });
} finally {
  await browser.close();
}
console.log(`OK: ${out}`);
