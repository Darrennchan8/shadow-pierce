// Renders icons/*.png and the store promo tile from SVG/HTML sources.
// Usage: CHROMIUM_PATH=/path/to/chromium node scripts/render-assets.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'icons', 'icon.svg'), 'utf8');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage();

for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: path.join(root, 'icons', `${size}.png`), omitBackground: true });
}

await page.setViewportSize({ width: 440, height: 280 });
await page.goto(`file://${path.join(root, 'store', 'promo-tile.html')}`);
await page.screenshot({ path: path.join(root, 'store', 'promo-tile-440x280.png') });

await browser.close();
