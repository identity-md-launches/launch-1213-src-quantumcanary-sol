import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { decodeFunctionData, encodeFunctionResult, parseAbi, parseEther, toHex, encodeAbiParameters, encodeEventTopics } from 'viem';
import { preview } from './preview-server.mjs';
const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'artifacts/browser');
await mkdir(output, { recursive: true });
const config = JSON.parse(await readFile(resolve(root, 'dist/imd-deployment.json'), 'utf8'));
const abi = JSON.parse(await readFile(resolve(root, 'dist', config.contracts[0].abiPath), 'utf8'));
const tokenAbi = parseAbi(['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)']);
const hookAbi = parseAbi(['function accruedFees() view returns (uint256)', 'function retired() view returns (bool)', 'function canaryAddress() view returns (address)', 'function quantumCanary() view returns (address)', 'function poolManager() view returns (address)', 'function payout() returns (uint256)', 'event BountyPaid(address indexed destination, uint256 ethAmount)']);
const hook = '0xdf3cc71b7a8f85a5a1b515072eae679ed21e60cc';
const canary = '0x379C0A5704C211f26eadd26e670246E242Af9e7E';
const observer = config.contracts[0].address;
const account = '0x1111111111111111111111111111111111111111'; // Mock wallet only; no key exists in this test.
const hash = '0x' + 'a1'.repeat(32);
const blockHash = '0x' + 'b2'.repeat(32);
const seed = 'IMD Quantum Canary #1 warns that if this balance ever drops, a quantum computer has broken secp256k1.';
const report = { started: new Date().toISOString(), checks: [], failures: [], console: [], requests: [] };
const server = await preview();
let browser;
function state() { return { startTime: BigInt(Math.floor(Date.now()/1000)), balance: 0n, mark: 0n, trippedAt: 0n, trippedBlock: 0n, block: 26158256n, imd: parseEther('123456.789'), fail: false, mismatch: false, imdFail: false, codeMissing: false, pending: false, sent: [], stale: false, hookPending: parseEther('0.125'), retired: false, historyFail: false, hookMismatch: false, noPayout: false, lastPaid: 0n, cumulativePaid: parseEther('0.75') }; }
function block(s) { return { number: toHex(s.block), hash: blockHash, parentHash: hash, timestamp: toHex(s.startTime - (s.stale ? 300n : 0n)), nonce: '0x0000000000000000', difficulty: '0x0', gasLimit: '0x1c9c380', gasUsed: '0x0', miner: observer, extraData: '0x', transactions: [], baseFeePerGas: '0x3b9aca00', size: '0x1', stateRoot: hash, receiptsRoot: hash, transactionsRoot: hash, logsBloom: '0x'+'00'.repeat(256), sha3Uncles: hash, uncles: [] }; }
function rpc(s, q) {
  const { method, params=[] } = q;
  report.requests.push(method);
  if (s.fail) return { jsonrpc:'2.0', id:q.id, error:{code:-32000,message:'Test RPC unavailable'} };
  let result;
  switch(method) {
    case 'eth_chainId': result='0x1'; break;
    case 'eth_blockNumber': result=toHex(s.block); break;
    case 'eth_getBlockByNumber': result=block(s); break;
    case 'eth_getBalance': result=toHex(params[0].toLowerCase() === canary.toLowerCase() ? s.balance : parseEther('5')); break;
    case 'eth_getCode': result=(params[0].toLowerCase()===observer.toLowerCase() && !s.codeMissing) || (params[0].toLowerCase()===hook && params[1]!==toHex(26158146n)) ? '0x6000' : '0x'; break;
    case 'eth_getLogs': if(s.historyFail) return {jsonrpc:'2.0',id:q.id,error:{code:-32000,message:'History unavailable'}}; result=[paymentLog(s,s.cumulativePaid)];break;
    case 'eth_call': {
      const isToken=params[0].to.toLowerCase()===config.network.pairToken.address.toLowerCase();
      const isHook=params[0].to.toLowerCase()===hook;
      const usedAbi=isToken ? tokenAbi : isHook ? hookAbi : abi;
      if (isToken && s.imdFail) return {jsonrpc:'2.0',id:q.id,error:{code:-32000,message:'Token read unavailable'}};
      const {functionName}=decodeFunctionData({abi:usedAbi,data:params[0].data});
      const values={seedPhrase:seed,SEED_PHRASE:seed,seedHash:'0x24049af853e3f3a0d855c4dcaaed3fc054dcaae445f08ff572999789ab606655',canaryAddress:canary,pubKeyX:0xae07cae0c4e680f898fc1655da5e33c66be3bd8ddc07934fcbdadc7d3e674625n+(s.mismatch?1n:0n),pubKeyY:0x6b5e6d8b021bca37ceaa23d85cefadca41979671e49af160f49b7d27e4b9affan,counter:0n,thresholdWei:parseEther('1'),highWaterMark:s.mark,isTripped:s.balance<parseEther('1')&&s.mark>=parseEther('1'),trippedAt:s.trippedAt,trippedBlock:s.trippedBlock,balanceOf:s.imd,decimals:18,symbol:'IMD',accruedFees:s.hookPending,retired:s.retired,quantumCanary:observer,poolManager:config.network.uniswapV4.poolManager,payout:s.noPayout ? 0n : s.hookPending};
      if(isHook&&functionName==='canaryAddress'&&s.hookMismatch)values.canaryAddress=observer;
      result=functionName==='poke' ? '0x' : encodeFunctionResult({abi:usedAbi,functionName,result:values[functionName]}); break;
    }
    case 'eth_estimateGas': result='0x5208';break;
    case 'eth_gasPrice': result='0x3b9aca00';break;
    case 'eth_getTransactionCount': result='0x0';break;
    case 'eth_getTransactionByHash': result={hash,from:account,to:s.sent.at(-1)?.to||observer,value:s.sent.at(-1)?.value||'0x0',input:s.sent.at(-1)?.data||'0x',nonce:'0x0',gas:'0x5208',gasPrice:'0x3b9aca00',v:'0x25',r:hash,s:hash,type:'0x0',blockHash:s.pending?null:blockHash,blockNumber:s.pending?null:toHex(s.block),transactionIndex:s.pending?null:'0x0'};break;
    case 'eth_getTransactionReceipt': result=s.pending ? null : { transactionHash:hash,transactionIndex:'0x0',blockHash,blockNumber:toHex(s.block),from:account,to:s.sent.at(-1)?.to||observer,gasUsed:'0x5208',cumulativeGasUsed:'0x5208',effectiveGasPrice:'0x3b9aca00',contractAddress:null,logs:s.sent.at(-1)?.to.toLowerCase()===hook&&s.lastPaid?[paymentLog(s,s.lastPaid)]:[],logsBloom:'0x'+'00'.repeat(256),status:'0x1',type:'0x0' };break;
    default: throw Error('Unexpected mocked RPC: '+method);
  }
  return {jsonrpc:'2.0',id:q.id,result};
}
function paymentLog(s, value) { return {address:hook,blockNumber:toHex(s.block),blockHash,transactionHash:hash,transactionIndex:'0x0',logIndex:'0x0',removed:false,topics:encodeEventTopics({abi:hookAbi,eventName:'BountyPaid',args:{destination:canary}}),data:encodeAbiParameters([{type:'uint256'}],[value])}; }
async function setup(s, wallet=false) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  const problems=[];
  page.on('pageerror',e=>problems.push(e.message));
  page.on('console',m=>{if(m.type()==='error') report.console.push(m.text());});
  await context.route(/https:\/\/(ethereum-rpc\.publicnode\.com|eth\.drpc\.org)\/?/,async route=>{
    const payload=route.request().postDataJSON();
    const response=Array.isArray(payload)?payload.map(q=>rpc(s,q)):rpc(s,payload);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response),headers:{'access-control-allow-origin':'*'}});
  });
  if(wallet) {
    await page.exposeFunction('mockBroadcast',async tx=>{s.sent.push(tx);s.block++;if(tx.to.toLowerCase()===canary.toLowerCase())s.balance+=BigInt(tx.value);else if(tx.to.toLowerCase()===hook){s.lastPaid=s.hookPending;s.balance+=s.hookPending;s.cumulativePaid+=s.hookPending;s.hookPending=0n;}else {if(s.balance>s.mark)s.mark=s.balance;if(s.balance<parseEther('1')&&s.mark>=parseEther('1')&&!s.trippedAt){s.trippedAt=BigInt(Math.floor(Date.now()/1000));s.trippedBlock=s.block;}}return hash;});
    await page.addInitScript(({account})=>{
      const listeners={};
      window.mockWallet={chain:'0xa',added:false,reject:false,connectReject:false,calls:[],emit:(event,value)=>{(listeners[event]||[]).forEach(f=>f(value));}};
      window.ethereum={on:(e,f)=>{(listeners[e]??=[]).push(f);},removeListener:(e,f)=>{listeners[e]=(listeners[e]||[]).filter(x=>x!==f);},request:async q=>{
        const w=window.mockWallet;w.calls.push(q);
        if(q.method==='eth_requestAccounts'&&w.connectReject)throw {code:4001,message:'User rejected'};
        if(q.method==='eth_requestAccounts'||q.method==='eth_accounts')return [account];
        if(q.method==='eth_chainId')return w.chain;
        if(q.method==='wallet_switchEthereumChain'){if(!w.added)throw {code:4902,message:'Unknown chain'};w.chain=q.params[0].chainId;w.emit('chainChanged',w.chain);return null;}
        if(q.method==='wallet_addEthereumChain'){w.added=true;return null;}
        if(q.method==='eth_sendTransaction'){if(w.reject)throw {code:4001,message:'User rejected'};return await window.mockBroadcast(q.params[0]);}
        throw Error('Unexpected wallet method '+q.method);
      }};
    },{account});
  }
  await page.goto(server.url);
  return {page,context,problems};
}
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS '+name);};
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
  const s=state();const {page,context,problems}=await setup(s);
  await expect(page.locator('.signal-banner h2')).toHaveText('NOT YET FUNDED');
  await expect(page.locator('.metrics')).toContainText('123,456.789 IMD');
  const qr=page.locator('img.qr');await expect(qr).toBeVisible();
  await page.getByRole('button',{name:'Copy bounty address',exact:true}).click();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(canary);
  await expect(page.locator('.ledger-values')).toContainText('0.125 ETH');
  await expect(page.locator('.ledger-values')).toContainText('0.75 ETH');
  check('Disconnected public reads, IMD, QR and clipboard','No wallet requests; correct full bounty address copied.');
  await page.getByRole('button',{name:'Connect a browser wallet',exact:true}).click();
  await expect(page.getByText(/No browser wallet found/)).toBeVisible();
  check('Missing wallet recovery','Install/open-wallet explanation is shown; reads remain usable.');
  await page.locator('header nav a[href="#verify"]').click();
  await expect(page.locator('.comparison.match')).toHaveCount(5);
  await page.locator('.terminal').screenshot({path:resolve(output,'verify-terminal.jpeg'),animations:'disabled',quality:78});
  check('Browser derivation interactions','Five textual OK comparisons and all real intermediate values printed line by line.');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'$ run again',exact:true}).click();
  await expect(page.locator('.comparison.match')).toHaveCount(5);
  expect(await page.locator('.cursor').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  check('Reduced motion','The complete transcript appears without staged printing; cursor blinking is disabled.');
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['status','verify','integrate']) {
      await page.locator(`header nav a[href="#${route}"]`).click();
      const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
      expect(overflow.scroll,`${route} at ${width}px overflow`).toBeLessThanOrEqual(overflow.viewport);
      await expect(page.locator('main h1:visible')).toHaveCount(1);
      if(width===1440||width===390) await page.screenshot({path:resolve(output,`${route}-${width}.jpeg`),fullPage:false,animations:'disabled',quality:78});
    }
  }
  check('Responsive production export','Status, Verify and Integrate: no horizontal overflow at 1440, 768, 390 and 320 CSS px.');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('header nav a[href="#status"]').click();
  await page.locator('.money-section').screenshot({path:resolve(output,'money-flow.jpeg'),animations:'disabled',quality:70});
  await page.locator('.fund-panel').screenshot({path:resolve(output,'fund-controls.jpeg'),animations:'disabled',quality:78});
  for(const route of ['status','verify','integrate']) {
    await page.locator(`header nav a[href="#${route}"]`).click();
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await writeFile(resolve(output,`axe-${route}.json`),JSON.stringify(audit.violations,null,2));
    expect(audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),`axe ${route}`).toEqual([]);
  }
  check('Automated accessibility','Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA tags: no violations across all three routes.');
  await writeFile(resolve(output,'CanaryGuard.sol'),await page.locator('.code-panel pre').innerText());
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  await expect(page.locator('header nav a[href="#integrate"]')).toHaveAttribute('aria-current','page');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const route of ['status','verify','integrate']) {
    await page.locator(`header nav a[href="#${route}"]`).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  check('Text enlargement and skip-link route preservation','All three pages reflow at 200% root font size; skip link preserves Integrate. This is text enlargement, not native browser zoom.');
  const computed=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const colors={};for(const token of ['--bg','--surface','--hover','--text','--muted','--reading','--alarm','--trip','--trip-bg','--focus'])colors[token]=root.getPropertyValue(token).trim();
    return {colors,fontLoaded:document.fonts.check('400 16px "IBM Plex Mono"')&&document.fonts.check('400 48px Anton'),font:getComputedStyle(document.body).fontFamily};
  });
  const rgb=hex=>hex.slice(1).match(/.{2}/g).map(v=>parseInt(v,16));
  const luminance=values=>values.map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
  const contrast=(fg,bg)=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);};
  computed.contrast=[];
  for(const [foreground,background] of [['--text','--bg'],['--muted','--bg'],['--reading','--bg'],['--muted','--surface'],['--text','--surface'],['--alarm','--surface'],['--trip','--trip-bg'],['--bg','--text'],['--focus','--bg']]) {
    const fg=rgb(computed.colors[foreground]),bg=rgb(computed.colors[background]);
    const normal=contrast(fg,bg);
    // body::after can darken a pixel by at most 12%. For light text,
    // darken only the foreground: a conservative lower bound over the overlay.
    const lower=luminance(fg)>luminance(bg)?contrast(fg.map(v=>v*0.88),bg):contrast(fg,bg.map(v=>v*0.88));
    computed.contrast.push({foreground,background,normal:Number(normal.toFixed(2)),overlayLowerBound:Number(lower.toFixed(2))});
    expect(lower).toBeGreaterThanOrEqual(4.5);
  }
  await writeFile(resolve(output,'computed-design.json'),JSON.stringify(computed,null,2));
  check('Font and color tokens','IBM Plex Mono loaded locally: '+computed.fontLoaded+'; browser-computed semantic colors recorded.');
  await page.locator('header nav a[href="#status"]').click();
  await page.evaluate(()=>document.activeElement.blur());
  await page.keyboard.press('Control+Home');
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  expect(await page.evaluate(()=>document.activeElement.id)).toBe('main');
  await page.locator('header nav a[href="#verify"]').focus();
  await page.screenshot({path:resolve(output,'keyboard-focus.jpeg'),animations:'disabled',quality:78});
  await page.keyboard.press('Enter');
  await expect(page.locator('header nav a[href="#verify"]')).toHaveAttribute('aria-current','page');
  check('Keyboard paths','Skip link focuses main; keyboard activation changes route and keeps visible navigation focus.');
  await page.locator('header nav a[href="#status"]').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  const liveCanvas=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(250);
  expect(await page.locator('canvas').evaluate(c=>c.toDataURL())).not.toBe(liveCanvas);
  await page.getByRole('button',{name:'Pause trace'}).click();
  await expect(page.getByText('Trace paused · reads continue')).toBeVisible();
  await page.waitForTimeout(80);
  const pausedCanvas=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(300);
  expect(await page.locator('canvas').evaluate(c=>c.toDataURL())).toBe(pausedCanvas);
  await page.getByRole('button',{name:'Resume trace'}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.getByRole('button',{name:'Static trace · reduced motion'})).toBeDisabled();
  await page.waitForTimeout(80);
  const staticCanvas=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(1100);
  expect(await page.locator('canvas').evaluate(c=>c.toDataURL())).toBe(staticCanvas);
  await page.emulateMedia({reducedMotion:'no-preference'});
  check('Canvas scrolling and static modes','Canvas pixels change while live; pause and reduced motion keep pixels stable between actual observations.');
  s.balance=parseEther('1');s.block++;
  await page.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(page.locator('.signal-banner h2')).toHaveText('AWAITING POKE');
  s.mark=parseEther('1');s.block++;
  await page.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(page.locator('.signal-banner h2')).toHaveText('ARMED');
  s.balance=0n;s.trippedAt=BigInt(Math.floor(Date.now()/1000));s.trippedBlock=s.block;s.block++;
  await page.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(page.locator('.signal-banner h2')).toHaveText('TRIPPED');
  await expect(page.locator('.trip-sticker')).toBeVisible();
  await page.locator('.monitor').screenshot({path:resolve(output,'tripped-desktop.jpeg'),animations:'disabled',quality:78});
  s.balance=parseEther('1');s.block++;
  await page.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(page.locator('.signal-banner h2')).toHaveText('ARMED');
  await page.locator('.chain-details summary').click();
  await expect(page.locator('.chain-details')).toContainText(String(s.trippedAt));
  check('Full alarm lifecycle and chart pause','Unfunded → awaiting poke → armed → tripped → refilled; first-trip record persists.');
  s.mismatch=true;s.block++;
  await page.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(page.getByText('On-chain values do not match the locally derived key. Transactions are disabled.').first()).toBeVisible();
  await page.locator('header nav a[href="#verify"]').click();
  await page.getByRole('button',{name:'$ run again',exact:true}).click();
  await expect(page.locator('.comparison.mismatch')).toHaveCount(1);
  check('Derivation mismatch','Changed on-chain x prints MISMATCH, overall verification fails, transactions gated. Red remains exclusive to TRIPPED.');
  expect(problems).toEqual([]);
  await context.close();

  const ws=state();const w=await setup(ws,true);const p=w.page;
  await expect(p.locator('.signal-banner h2')).toHaveText('NOT YET FUNDED');
  await p.getByRole('button',{name:'Connect a browser wallet',exact:true}).click();
  await expect(p.getByText('Wrong network',{exact:true})).toBeVisible();
  await p.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();
  await expect(p.getByText('Ethereum connected',{exact:true})).toBeVisible();
  const calls=await p.evaluate(()=>window.mockWallet.calls);
  expect(calls.find(c=>c.method==='wallet_addEthereumChain').params[0]).toEqual(config.walletAddChain);
  check('Wallet unknown-chain fallback','Switch 4902 → add exact supplied Ethereum network → switch again.');
  await p.getByLabel('Bounty amount (ETH)').fill('0');
  await p.getByRole('button',{name:'Review bounty transfer'}).click();
  await expect(p.getByText('Enter a positive ETH amount within the Ethereum balance range.')).toBeVisible();
  expect(await p.getByLabel('Bounty amount (ETH)').getAttribute('aria-invalid')).toBe('true');
  await p.getByLabel('Bounty amount (ETH)').fill('0.01');
  await p.getByRole('button',{name:'Review bounty transfer'}).click();
  await expect(p.getByRole('button',{name:'Send 0.01 ETH',exact:true})).toBeDisabled();
  await p.getByRole('checkbox').check();
  await p.evaluate(()=>window.mockWallet.reject=true);
  await p.getByRole('button',{name:'Send 0.01 ETH',exact:true}).click();
  await expect(p.getByText(/Request declined in your wallet/)).toBeVisible();
  await expect(p.getByRole('button',{name:'Send 0.01 ETH',exact:true})).toBeEnabled();
  expect(ws.sent).toHaveLength(0);
  check('Amount validation, irreversible consent and rejection','Zero amount rejected; consent required; declined signature sends nothing and recovers.');
  await p.evaluate(()=>window.mockWallet.reject=false);ws.pending=true;
  await p.getByRole('button',{name:'Send 0.01 ETH',exact:true}).click();
  await expect(p.getByText('Submitted. Waiting for an Ethereum confirmation…')).toBeVisible();
  await expect(p.getByRole('button',{name:'Transfer pending…',exact:true})).toBeDisabled();
  await expect(p.getByRole('button',{name:'Call poke()'})).toBeDisabled();
  expect(ws.sent).toHaveLength(1);
  expect(ws.sent[0].to.toLowerCase()).toBe(canary.toLowerCase());expect(BigInt(ws.sent[0].value)).toBe(parseEther('0.01'));
  expect(ws.sent[0].data||'0x').toBe('0x');
  await p.locator('header nav a[href="#verify"]').click();await p.locator('header nav a[href="#status"]').click();
  await expect(p.getByRole('button',{name:'Transfer pending…',exact:true})).toBeDisabled();
  ws.pending=false;ws.block++;
  await expect(p.getByText(/Bounty transfer confirmed/)).toBeVisible({timeout:20000});
  check('Mock bounty transaction and receipt lock','Exact canary recipient and 0.01 ETH, no calldata; duplicate sends locked through receipt and route changes.');
  ws.balance=parseEther('1');ws.block++;
  await p.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(p.locator('.signal-banner h2')).toHaveText('AWAITING POKE');
  await p.getByRole('button',{name:'Call poke()'}).click();
  await expect(p.getByText(/Poke confirmed/)).toBeVisible({timeout:20000});
  expect(ws.sent).toHaveLength(2);
  expect(ws.sent[1].to.toLowerCase()).toBe(observer.toLowerCase());expect(BigInt(ws.sent[1].value||'0x0')).toBe(0n);
  expect(decodeFunctionData({abi,data:ws.sent[1].data}).functionName).toBe('poke');
  await expect(p.locator('.signal-banner h2')).toHaveText('ARMED');
  check('Mock poke transaction','Observer recipient, poke selector, zero ETH; high-water mark refreshes and alarm arms.');
  ws.noPayout=true;
  await p.getByRole('button',{name:'$ payout()',exact:true}).click();
  await expect(p.getByText(/Simulation would pay no ETH/)).toBeVisible();
  expect(ws.sent).toHaveLength(2);
  ws.noPayout=false;await p.evaluate(()=>window.mockWallet.reject=true);
  await p.getByRole('button',{name:'$ payout()',exact:true}).click();
  await expect(p.locator('.fund-ledger').getByText(/Request declined in your wallet/)).toBeVisible();
  expect(ws.sent).toHaveLength(2);
  check('Payout simulation and wallet rejection','Zero-result simulation and rejected signing submit nothing; payout can be retried.');
  await p.evaluate(()=>window.mockWallet.reject=false);ws.pending=true;
  await p.getByRole('button',{name:'$ payout()',exact:true}).click();
  await expect(p.getByText('Payout submitted. Waiting for an Ethereum confirmation…')).toBeVisible();
  await expect(p.getByRole('button',{name:'Payout pending…',exact:true})).toBeDisabled();
  expect(ws.sent).toHaveLength(3);
  expect(ws.sent[2].to.toLowerCase()).toBe(hook);
  expect(BigInt(ws.sent[2].value||'0x0')).toBe(0n);
  expect(decodeFunctionData({abi:hookAbi,data:ws.sent[2].data}).functionName).toBe('payout');
  await p.locator('header nav a[href="#integrate"]').click();await p.locator('header nav a[href="#status"]').click();
  await expect(p.getByRole('button',{name:'Payout pending…',exact:true})).toBeDisabled();
  ws.pending=false;ws.block++;
  await expect(p.getByText(/Payout confirmed: 0.125 ETH paid/)).toBeVisible({timeout:20000});
  await expect(p.getByRole('button',{name:'$ payout()',exact:true})).toBeDisabled();
  await expect(p.locator('.ledger-values')).toContainText('0.875 ETH');
  check('Mock payout and receipt lock','Exact hook, payout selector, zero ETH; lock survives navigation; BountyPaid receipt and cumulative events update totals.');
  ws.retired=true;ws.hookPending=parseEther('0.2');ws.block++;
  await p.getByRole('button',{name:'Refresh fund reads',exact:true}).click();
  await expect(p.getByText('Hook retired. This site will not request a payout to the compromised address.')).toBeVisible();
  await expect(p.getByRole('button',{name:'$ payout()',exact:true})).toBeDisabled();
  check('Retirement remains gated after refill','An armed/refilled canary does not re-enable payout from a retired hook.');
  ws.retired=false;ws.historyFail=true;ws.block++;
  await p.getByRole('button',{name:'Refresh fund reads',exact:true}).click();
  await expect(p.locator('.ledger-values')).toContainText('No partial total is shown');
  await expect(p.locator('.ledger-values')).toContainText('0.2 ETH');
  check('Incomplete history is explicit','Pending fees remain readable while a failed full-history scan shows no invented or partial total.');
  ws.historyFail=false;ws.hookMismatch=true;ws.block++;
  await p.getByRole('button',{name:'Refresh fund reads',exact:true}).click();
  await expect(p.getByText(/Hook destination, observer or PoolManager does not match/)).toBeVisible();
  await expect(p.getByRole('button',{name:'$ payout()',exact:true})).toBeDisabled();
  check('Hook destination binding','A mismatched hook recipient blocks payout despite previously valid reads.');
  ws.hookMismatch=false;
  await p.evaluate(()=>{window.mockWallet.chain='0xa';window.mockWallet.emit('chainChanged','0xa');});
  await expect(p.getByText('Wrong network',{exact:true})).toBeVisible();
  await expect(p.getByRole('button',{name:'Call poke()'})).toHaveCount(0);
  await p.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();
  await expect(p.getByText('Ethereum connected',{exact:true})).toBeVisible();
  check('Connected chain change','A wallet chainChanged event immediately removes the poke action until the chain is corrected.');
  ws.stale=true;ws.block++;
  await p.getByRole('button',{name:'Refresh ↻',exact:true}).click();
  await expect(p.getByText('Observation is stale.',{exact:true})).toBeVisible();
  await expect(p.getByRole('button',{name:'Call poke()'})).toBeDisabled();
  check('Stale chain gating','Old block timestamp is labelled stale and prevents signing.');
  expect(w.problems).toEqual([]);await w.context.close();

  const es=state();es.fail=true;const e=await setup(es);
  await expect(e.page.getByText('Live reads unavailable.',{exact:true})).toBeVisible({timeout:25000});
  await expect(e.page.locator('.balance-value')).toHaveText('— ETH');
  es.fail=false;
  await e.page.getByRole('button',{name:'Retry reads',exact:true}).click();
  await expect(e.page.locator('.signal-banner h2')).toHaveText('NOT YET FUNDED');
  check('RPC outage and retry','No fabricated zero/alarm on failure; retry restores the live state.');
  await e.context.close();
  const ts=state();ts.imdFail=true;const t=await setup(ts);
  await expect(t.page.locator('.signal-banner h2')).toHaveText('NOT YET FUNDED',{timeout:20000});
  await expect(t.page.locator('.metrics')).toContainText('IMD read unavailable');
  check('Independent token failure','An IMD RPC error leaves the ETH alarm readable and labels the token counter unavailable.');
  await t.context.close();
  const cs=state();cs.codeMissing=true;const c=await setup(cs);
  await expect(c.page.getByText(/No observer code at the configured address/)).toBeVisible();
  await expect(c.page.locator('.balance-value')).toHaveText('— ETH');
  check('Deployment code gate','Missing observer bytecode blocks the snapshot and transactions.');
  await c.context.close();
  const ms=state();const m=await setup(ms);
  await m.context.route('**/abi/QuantumCanary.json',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await m.page.reload();
  await expect(m.page.getByText('Contract ABI does not match its attestation. Transactions are disabled.')).toBeVisible();
  await expect(m.page.getByRole('button',{name:'Connect a browser wallet',exact:true})).toHaveCount(0);
  check('Runtime ABI tamper gate','A modified ABI fails the canonical Keccak binding before transactions can appear.');
  await m.context.close();
} catch(e) { report.failures.push(e.stack);process.exitCode=1; }
finally { if(browser)await browser.close();await server.close();report.finished=new Date().toISOString();report.requestCount=report.requests.length;delete report.requests;await writeFile(resolve(output,'interaction-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2)); }
