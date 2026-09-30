// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium,firefox} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',runtime=process.env.CODEC_RUNTIME??'asyncify';
const setup=JSON.parse(await readFile('build/codec-preparation/installed-'+runtime+'.json','utf8'));
let fault='';const requests=[];
const server=createServer(async(req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;requests.push({fault,path:name});
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<input type="file"><button>Start</button><div id="player"></div>');return;}
 const base=path.resolve(setup.work),file=path.resolve(base,name.slice(1));if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=await readFile(file);if(file.endsWith('.wasm')&&fault==='missing'){res.writeHead(404).end();return;}if(file.endsWith('.wasm')&&fault==='corrupt')bytes[bytes.length-1]^=1;res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/json');res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,browserServer;
const report={passed:false,family,runtime,setup,cases:[]};
try{
 if(family==='firefox'){browserServer=await firefox.launchServer({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}});browser=await firefox.connect(browserServer.wsEndpoint());}else browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=browser.version();
 for(fault of ['missing','corrupt']){
  const page=await browser.newPage();page.setDefaultTimeout(90000);await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('button').click();await page.locator('input').setInputFiles('build/codec-preparation/fixtures/multi-lossless.mkv');
  const sample=await page.evaluate(async runtime=>{const {Player}=await import('/node_modules/demuxe/dist/index.js');const p=new Player(document.querySelector('#player'),{assetBase:new URL('/deployed/',location.href).href,preview:false,remuxRuntime:runtime});try{await p.open(document.querySelector('input').files[0]);throw Error('Invalid engine was accepted');}catch(e){return {code:e.code,message:String(e),diagnostics:p.diagnostics};}finally{await p.destroy();}},runtime);
  assert.equal(sample.code,'ASSET_LOAD_FAILED');assert.ok(!requests.some(r=>r.fault===fault&&r.path.includes('/engine-adaptation-'+runtime+'/')&&!r.path.includes('/preparation/')));report.cases.push({fault,...sample});await page.close();
 }
 report.passed=true;
}catch(e){report.error=String(e.stack);process.exitCode=1;}
finally{if(browser)report.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});server.closeAllConnections();await new Promise(r=>server.close(r));await mkdir('results/media-components/production-preparation',{recursive:true});await writeFile('results/media-components/production-preparation/faults-'+runtime+'-'+family+'.json',JSON.stringify(report,null,2)+'\n');console.log(report.passed,report.error??'');}
