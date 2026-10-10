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
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.console.push(m.text()); });
  page.on('requestfailed', r => report.failures.push(r.url() + ': ' + r.failure()?.errorText));
  await page.goto(url);
  await expect(page.locator('.balance-value')).not.toHaveText('— ETH', { timeout: 45000 });
  report.checks.push({ name: 'Live production reads without wallet', result: await page.locator('.signal-banner').innerText(), balance: await page.locator('.balance-value').innerText() });
  await page.screenshot({ path: resolve(reportDir, 'live-status-desktop.jpeg'), fullPage: false, animations: 'disabled', quality: 70 });
  await expect(page.locator('.fund-ledger .field').first()).not.toContainText('—', { timeout: 45000 });
  report.checks.push({ name: 'Live hook ledger', result: await page.locator('.ledger-values').innerText() });
  await expect(page.locator('.market-read')).toContainText('Pool state at block', { timeout: 45000 });
  await expect(page.locator('.metrics .usd-value')).toHaveCount(1, { timeout: 20000 });
  report.checks.push({ name: 'Live Chainlink and PoolManager reads', result: await page.locator('.market-read').innerText(), threshold: await page.locator('.metrics .field').first().innerText(), bountyInput: await page.locator('#amount-context').innerText() });
  report.checks.push({ name: 'Live Hook payouts', result: await page.locator('.hook-history').innerText() });
  await page.locator('.money-intro').screenshot({ path: resolve(reportDir, 'token-identity-desktop.jpeg'), animations: 'disabled', quality: 78 });
  await page.locator('.market-read').screenshot({ path: resolve(reportDir, 'live-market.jpeg'), animations: 'disabled', quality: 78 });
  report.externalLinks = [];
  for (const route of ['status', 'verify', 'integrate']) {
    await page.locator(`header nav a[href="#${route}"]`).click();
    await expect(page.locator(`header nav a[href="#${route}"]`)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute('content','@Quantum_Canary');
    const links = await page.locator('a[href^="http"]').evaluateAll(anchors => anchors.filter(a => !a.closest('[hidden]')).map(a => ({ href:a.href, label:a.textContent.trim() })));
    const metadata = await page.locator('meta[content^="https://"]').evaluateAll(items => items.map(e=>({href:e.content,label:`Head metadata: ${e.getAttribute('property')||e.name}`})));
    links.push(...metadata);
    if(route==='verify') {
      const prompt=await page.locator('.ai-prompt').innerText();
      for(const href of prompt.match(/https:\/\/[^\s)]+/g)||[])links.push({href,label:'AI prompt reference'});
    }
    report.externalLinks.push({ route, links });
  }
  await writeFile(resolve(reportDir, 'external-links.json'), JSON.stringify(report.externalLinks, null, 2));
  await page.locator('header nav a[href="#status"]').click();
  for (const width of [390,320]) {
    await page.setViewportSize({width,height:900});
    await page.locator('.money-intro').screenshot({ path: resolve(reportDir, `token-identity-${width}.jpeg`), animations: 'disabled', quality: 78 });
    await page.locator('.market-read').screenshot({ path: resolve(reportDir, `market-${width}.jpeg`), animations: 'disabled', quality: 78 });
    await page.setViewportSize({width,height:1400});
    await page.locator('.provenance').screenshot({ path: resolve(reportDir, `provenance-${width}.jpeg`), animations: 'disabled', quality: 75 });
    await page.setViewportSize({width,height:900});
    await page.locator('.site-footer').screenshot({ path: resolve(reportDir, `footer-${width}.jpeg`), animations: 'disabled', quality: 75 });
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('header nav a[href="#verify"]').click();
  await expect(page.getByText(/OK \/ 5 of 5 on-chain comparisons match/)).toBeVisible();
  await page.screenshot({ path: resolve(reportDir, 'live-verify-desktop.jpeg'), fullPage: false, animations: 'disabled', quality: 70 });
  report.checks.push({ name: 'Live browser derivation', result: await page.locator('.verification-result').innerText() });
  const point=await page.locator('#fund .public-key code').allTextContents();
  const expectedX='0xae07cae0c4e680f898fc1655da5e33c66be3bd8ddc07934fcbdadc7d3e674625';
  const expectedY='0x6b5e6d8b021bca37ceaa23d85cefadca41979671e49af160f49b7d27e4b9affa';
  expect(point).toEqual([`0x04${expectedX.slice(2)}${expectedY.slice(2)}`,`0x02${expectedX.slice(2)}`,expectedX,expectedY]);
  await expect(page.locator('.ai-prompt')).toContainText(`pubKeyX() = ${expectedX}, pubKeyY() = ${expectedY}`);
  const actualSentence=await page.locator('.seed-quote').innerText();
  expect(Buffer.byteLength(actualSentence,'ascii')).toBe(101);
  await expect(page.locator('.ai-prompt')).toContainText(`Sentence (exact, 101 ASCII bytes, no trailing newline): ${actualSentence}. Procedure:`);
  report.checks.push({name:'Live public key and AI prompt', point, sentence:actualSentence, steps:await page.locator('.construction-steps code').allTextContents(), prompt:await page.locator('.ai-prompt').innerText()});
  for(const width of [1440,320]) {
    await page.setViewportSize({width,height:900});
    for(const [route,target,name] of [['status','#fund .public-key','key'],['verify','.construction','construction'],['verify','.verify-ai','ai'],['integrate','.public-key.compact','integrate-key']]) {
      await page.locator(`header nav a[href="#${route}"]`).click();
      await page.locator(target).evaluate(e=>e.scrollIntoView({block:'start'}));
      await page.screenshot({path:resolve(reportDir,`live-${name}-${width}.jpeg`),fullPage:false,animations:'disabled',quality:74});
    }
  }
  report.fonts = await page.evaluate(() => [...document.fonts].map(f => ({family:f.family, status:f.status})));
  report.block = await page.locator('.balance-meta').innerText();
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
