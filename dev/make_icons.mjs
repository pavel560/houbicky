// Regenerates the PWA icons from art/hrib-smrkovy.svg on the cream paper background (maskable-safe).
// Usage (server running on :8642):  PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node dev/make_icons.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const BASE = process.env.BASE || 'http://localhost:8642';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage();
// [file, size, character height as a fraction of the icon] — maskable keeps the art inside the 80 % safe circle
for (const [file, size, frac] of [['icon-192.png', 192, 0.8], ['icon-512.png', 512, 0.8], ['icon-maskable-512.png', 512, 0.6], ['apple-touch-icon.png', 180, 0.74]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;
    background:radial-gradient(circle at 50% 42%, #fff6dc 0%, #fbf4e4 45%, #f3e3c3 100%)">
    <img src="${BASE}/art/hrib-smrkovy.svg" style="height:${Math.round(size * frac)}px;margin-top:${Math.round(size * 0.02)}px"></body></html>`);
  await page.waitForFunction(() => document.images[0]?.complete && document.images[0].naturalWidth > 0);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('wrote', file);
}
await browser.close();
