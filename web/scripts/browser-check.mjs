import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium, expect } from '@playwright/test';
const root = resolve(import.meta.dirname, '../..');
const dist = resolve(root, 'dist');
const reportDir = resolve(root, 'artifacts/browser');
await mkdir(reportDir, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(dist, 'imd-deployment.json'), 'utf8'));
const abi = JSON.parse(await readFile(resolve(dist, manifest.contracts[0].abiPath), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/preview/')) { res.writeHead(404).end(); return; }
    const path = resolve(dist, pathname.slice('/preview/'.length) || 'index.html');
    if (!path.startsWith(dist + '/')) { res.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/preview/`;
let browser;
const report = { started: new Date().toISOString(), checks: [], console: [], failures: [] };
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.console.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(r.url() + ': ' + r.failure()?.errorText));
  await page.goto(url);
  await expect(page.locator('.balance-value')).not.toHaveText('— ETH', { timeout: 45000 });
  report.checks.push({ name: 'Live production reads without wallet', result: await page.locator('.signal-banner').innerText(), balance: await page.locator('.balance-value').innerText() });
  await page.screenshot({ path: resolve(reportDir, 'status-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.locator('header nav a[href="#verify"]').click();
  await page.getByRole('button', { name: 'Begin verification' }).click();
  await expect(page.getByText('✓ All 5 on-chain comparisons match.', { exact: false })).toBeVisible();
  await page.screenshot({ path: resolve(reportDir, 'verify-desktop.png'), fullPage: true, animations: 'disabled' });
  report.checks.push({ name: 'Live browser derivation', result: await page.locator('.verification-result').innerText() });
  await context.close();
} catch (e) {
  report.failures.push(e.stack);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
  await writeFile(resolve(reportDir, 'live-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
