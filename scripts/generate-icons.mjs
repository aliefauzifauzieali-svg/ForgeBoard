/**
 * Gera os PNGs do PWA a partir de `public/favicon.svg` usando o Chromium
 * do Playwright (já é dependência de dev — nada novo para instalar).
 *
 * Uso: `node scripts/generate-icons.mjs` (rode novamente se o logo mudar).
 * Saída: `public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png`
 *
 * - icon-*: marca em bleed total.
 * - maskable-512: fundo total + glifo centralizado a 72% (safe zone do maskable).
 * - apple-touch-icon: 180px, fundo total (o iOS arredonda sozinho).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const GLYPH = '<path d="M160 144h192v48H240v48h96v48h-96v80h-80z" fill="#ffffff"/>';
const BG = '<rect width="512" height="512" fill="#4f46e5"/>';

function svgDocument(inner, size) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">` +
    `${inner}</svg>`
  );
}

const SIZES = [
  { file: 'icon-192.png', size: 192, doc: svgDocument(`<rect width="512" height="512" rx="112" fill="#4f46e5"/>${GLYPH}`, 192) },
  { file: 'icon-512.png', size: 512, doc: svgDocument(`<rect width="512" height="512" rx="112" fill="#4f46e5"/>${GLYPH}`, 512) },
  // Maskable: sem cantos arredondados + glifo com respiro (safe zone ~80%).
  {
    file: 'maskable-512.png',
    size: 512,
    doc: svgDocument(`${BG}<g transform="translate(74,74) scale(0.71)">${GLYPH}</g>`, 512),
  },
  { file: 'apple-touch-icon.png', size: 180, doc: svgDocument(`<rect width="512" height="512" fill="#4f46e5"/>${GLYPH}`, 180) },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { file, size, doc } of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;padding:0">${doc}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: fileURLToPath(new URL(file, OUT)), clip: { x: 0, y: 0, width: size, height: size }, omitBackground: true });
    console.log(`ok: icons/${file} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
