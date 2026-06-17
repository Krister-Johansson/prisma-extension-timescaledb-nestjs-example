// Visual QA: screenshots each route in light + dark to apps/web/.screenshots/.
// Usage: start the dev server (npm run dev), then `npm run screenshot`.
// Override the target with BASE_URL=http://localhost:3001.
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const OUT = new URL('../.screenshots/', import.meta.url);

const ROUTES = [
  ['overview', '/'],
  ['alerts', '/alerts'],
  ['aggregates', '/aggregates'],
  ['system', '/system'],
  ['manage', '/manage'],
  ['sensor-detail', '/sensors/boiler-temp'],
  ['sensor-config', '/sensors/boiler-temp/config'],
];

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

for (const [name, path] of ROUTES) {
  for (const theme of ['light', 'dark']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
    await page.evaluate((t) => {
      document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);
    await new Promise((r) => setTimeout(r, 150));
    const file = new URL(`${name}-${theme}.png`, OUT);
    await page.screenshot({ path: file });
    console.log(`✓ ${name} (${theme})`);
  }
}

await browser.close();
