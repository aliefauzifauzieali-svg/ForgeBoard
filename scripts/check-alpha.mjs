// Diagnóstico: fotografa um PNG sobre fundo vermelho para revelar cantos opacos.
// Uso: node scripts/check-alpha.mjs <png> <saida.png>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('Uso: node scripts/check-alpha.mjs <png> <saida.png>');
  process.exit(1);
}
const b64 = readFileSync(src).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.setContent(
    `<body style="margin:0;background:#ff0000"><img src="data:image/png;base64,${b64}" width="256" height="256" style="display:block"></body>`,
  );
  await page.screenshot({ path: out });
} finally {
  await browser.close();
}
console.log(`OK: ${out}`);
