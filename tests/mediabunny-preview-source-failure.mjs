// SPDX-License-Identifier: Apache-2.0
// Check transport error identity through the actual separately deployed parser.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chromium, firefox, webkit} from 'playwright';
const [deployment, fixture, receiptPath, kind, engine] = process.argv.slice(2);
assert.ok(deployment && fixture && receiptPath && ['mp4','webm'].includes(kind) && ['chrome','firefox','webkit'].includes(engine));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(join(deployment, 'demuxe-mediabunny-format-assets.json')));
const entry = manifest.entries.find(e => e.name === `preview-${kind}`);
assert.equal(entry.path, `web/providers/mediabunny/formats/preview-${kind}.js`);
const bundle = await readFile(join(deployment, entry.path)), input = await readFile(fixture);
assert.equal(bundle.length, entry.bytes); assert.equal(hash(bundle), entry.sha256);
const browser = await ({chrome:chromium, firefox, webkit}[engine]).launch({headless:true, ...(engine === 'chrome' ? {channel:'chrome'} : {})});
try {
 const page = await browser.newPage();
 await page.route('https://preview-failure.test/**', route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({contentType:'text/html', body:'<body></body>'});
  if (path === `/${entry.path}`) return route.fulfill({contentType:'text/javascript', body:bundle});
  return route.abort();
 });
 await page.goto('https://preview-failure.test/');
 const observed = await page.evaluate(async ({path, size}) => {
  const {createMediaBunnyPreviewProvider} = await import('/'+path);
  const request = signal => ({sourceId:'fixture', time:0.2, width:64, height:48, signal});
  async function run(mode) {
   const failure = new Error('original transport failure');
   const reason = new DOMException('original cancellation', 'AbortError');
   let reads=0, closes=0, started;
   const readStarted = new Promise(resolve => {started=resolve;});
   const controller = new AbortController();
   const source = {id:'fixture', size, ownership:'owned', close(){closes++;}, async read() {
    reads++; started();
    if(mode==='transport') throw failure;
    return new Promise(()=>{});
   }};
   const provider = createMediaBunnyPreviewProvider({getSource:()=>source, timeoutMs:5000});
   const pending = provider.getFrame(request(controller.signal));
   const outcome = pending.then(()=>({resolved:true}),error=>({resolved:false, same:error === (mode==='transport'?failure:reason), name:error?.name, message:error?.message}));
   await Promise.race([readStarted, new Promise((_,reject)=>setTimeout(()=>reject(new Error('Parser did not request source bytes')), 7000))]);
   if(mode==='abort') controller.abort(reason);
   const result=await outcome;
   await provider.release();
   return {...result, reads, closes};
  }
  return {transport:await run('transport'), abort:await run('abort')};
 }, {path:entry.path, size:input.length});
 for(const mode of ['transport','abort']) {
  assert.equal(observed[mode].resolved,false); assert.equal(observed[mode].same,true);
  assert.ok(observed[mode].reads>0); assert.equal(observed[mode].closes,1);
 }
 assert.equal(observed.transport.message,'original transport failure'); assert.equal(observed.abort.name,'AbortError');
 const receipt={status:'preview-source-failure-browser-passed-not-release',kind,browserEngine:engine,browser:browser.version(),harnessSHA256:hash(await readFile(new URL(import.meta.url))),fixture:{bytes:input.length,sha256:hash(input)},entry,observed,limitations:['Actual format parser and source-error/abort paths only; no decoded media or complete player composition.', 'Browser is Playwright WebKit where applicable, not a Safari release qualification.']};
 await writeFile(receiptPath, JSON.stringify(receipt,null,2)+'\n'); console.log(JSON.stringify(receipt));
} finally { await browser.close(); }
