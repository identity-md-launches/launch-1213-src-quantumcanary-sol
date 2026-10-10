// Optional regeneration. The committed PNG is copied by every normal Vite build.
// Render the site's existing artwork and display font; no remote assets.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
const publicDir = resolve(import.meta.dirname, '../public');
const font = (await readFile(resolve(publicDir, 'fonts/anton-latin-400.woff2'))).toString('base64');
const art = (await readFile(resolve(publicDir, 'art/ink/hero.png'))).toString('base64');
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="UTF-8"><style>
    @font-face{font-family:Anton;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:400}
    *{box-sizing:border-box}body{margin:0;background:#090e0b;color:#a6edb6;width:1200px;height:630px;display:flex;align-items:center;padding:56px;gap:30px}
    h1{font:400 66px/1.12 Anton,sans-serif;text-transform:uppercase;letter-spacing:-.015em;margin:0;width:650px;flex:none}span{color:#eee56b}
    img{width:412px;height:412px;object-fit:contain;image-rendering:pixelated;mix-blend-mode:screen;opacity:.82}
  </style><h1>A public <span>alarm</span> for the day a quantum computer breaks Ethereum.</h1><img src="data:image/png;base64,${art}" alt="Dithered Quantum Canary mascot"></html>`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
  await page.screenshot({ path: resolve(publicDir, 'social-preview.png'), animations: 'disabled' });
  console.log('Generated public/social-preview.png (1200 × 630) with the existing Anton face and dithered hero.');
} finally { await browser.close(); }
