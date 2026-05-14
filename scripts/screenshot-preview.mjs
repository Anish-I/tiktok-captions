// Captures full-page + per-card screenshots of the preview gallery for review.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'screenshots');
mkdirSync(OUT, { recursive: true });

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:5555/';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // sharp text
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });

// Give fonts a moment to swap in.
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(300);

// Full-page overview.
await page.screenshot({
  path: join(OUT, 'gallery-full.png'),
  fullPage: true,
});

// One per card so we can scrutinise each font in isolation.
const cards = await page.$$('.card');
console.log(`found ${cards.length} cards`);
for (const card of cards) {
  const id = await card.evaluate(el => el.getAttribute('data-preset'));
  await card.screenshot({ path: join(OUT, `card-${id}.png`) });
  console.log(`  card-${id}.png`);
}

await browser.close();
console.log(`\nscreenshots in ${OUT}`);
