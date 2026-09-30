// SPDX-License-Identifier: Apache-2.0
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';
import {buildDemuxe} from '../packages/bundler/index.mjs';
import {closeTestBrowser} from './head-to-head/browser-exit.mjs';
const family=process.env.BROWSER??'chrome',work=await mkdtemp(path.resolve('build/bundle-flexibility/browser-'));
const core=path.join(work,'core');
const files={
 'package.json':JSON.stringify({name:'demuxe',version:'test',type:'module',exports:{'.':{import:'./dist/index.js'},'./player':{import:'./dist/player.js'}}}),
 'LICENSE':'Apache-2.0',
 'dist/player.js':'export function definePlayerElement(){}',
 'dist/index.js':`
 export async function exercise(){
  const request=new Request(new URL('../web/data.json',import.meta.url));
  const data=await(await fetch(request)).json();
  const head=await fetch(request,{method:'HEAD'});
  const missing=await fetch(new URL('../web/missing.wasm',import.meta.url));
  const controller=new AbortController();controller.abort();let aborted=false;try{await fetch(request,{signal:controller.signal});}catch(e){aborted=e.name==='AbortError';}
  const worker=new Worker(new URL('../web/outer.js?audioOnly=1',import.meta.url),{type:'module'});
  const nested=await new Promise((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=e=>reject(Error(e.message));worker.postMessage(42);});worker.terminate();
  const context=new AudioContext();await context.audioWorklet.addModule(new URL('../web/worklet.js',import.meta.url));
  const node=new AudioWorkletNode(context,'demuxe-test');node.disconnect();await context.close();
  return {data,head:head.status,headBytes:await head.text(),missing:missing.status,aborted,nested};
 }
 `,
 'web/data.json':'{"answer":42}',
 'web/empty.wasm':Buffer.from([0,97,115,109,1,0,0,0]),
 'web/outer.js':`const child=new Worker(new URL('./inner.js',import.meta.url),{type:'module'});onmessage=e=>child.postMessage(e.data);child.onmessage=e=>{child.terminate();postMessage({...e.data,query:new URL(import.meta.url).search});};`,
 'web/inner.js':`onmessage=async e=>{const bytes=await(await fetch(new URL('./empty.wasm',import.meta.url))).arrayBuffer();await WebAssembly.compile(bytes);const xhr=new XMLHttpRequest();xhr.open('GET',new URL('./data.json',import.meta.url),false);xhr.send();postMessage({answer:e.data,wasm:bytes.byteLength,xhr:JSON.parse(xhr.responseText).answer});};`,
 'web/worklet.js':`registerProcessor('demuxe-test',class extends AudioWorkletProcessor{process(){return false;}});`,
};
files['license-map.json']=JSON.stringify(Object.fromEntries([...Object.keys(files),'license-map.json'].map(name=>[name,['Apache-2.0']])));
for(const [name,data]of Object.entries(files)){const target=path.join(core,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);}
await buildDemuxe({core,delivery:'embedded',output:path.join(work,'out')});
const requests=[];
const server=createServer(async(req,res)=>{
 requests.push(req.url);res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<button id="start">Start</button>');return;}
 if(req.url==='/demuxe.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(work,'out/demuxe.mjs')));return;}
 res.writeHead(404).end();
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
const report={passed:false,family,requests};
try{
 browser=await(family==='firefox'?firefox.launch({headless:true}):chromium.launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{})}));
 report.browser=browser.version();const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#start').click();
 report.result=await page.evaluate(async()=>{
  const NativeWorker=Worker,NativeFetch=fetch;
  const {createDemuxeRuntime}=await import('/demuxe.mjs');
  const a=await createDemuxeRuntime(),b=await createDemuxeRuntime();
  const first=await a.api.exercise();a.dispose();
  const second=await b.api.exercise();const before=b.diagnostics();b.dispose();b.dispose();
  return {first,second,before,a:a.diagnostics(),b:b.diagnostics(),globalsUnchanged:Worker===NativeWorker&&fetch===NativeFetch};
 });
 assert.deepEqual(errors,[]);assert.equal(report.result.globalsUnchanged,true);
 for(const value of [report.result.first,report.result.second]){assert.deepEqual(value,{data:{answer:42},head:200,headBytes:'',missing:404,aborted:true,nested:{answer:42,wasm:8,xhr:42,query:'?audioOnly=1'}});}
 for(const value of [report.result.a,report.result.b]){assert.equal(value.objectURLs,0);assert.equal(value.workers,0);assert.equal(value.disposed,true);}
 assert.equal(report.result.before.workers,0);assert.ok(requests.every(n=>['/','/demuxe.mjs','/favicon.ico'].includes(n)));report.passed=true;
 console.log(family,'embedded nested workers, queued messages, queries, Wasm, XHR, AudioWorklet, isolated instances, abort, missing assets and cleanup passed');
}finally{if(browser)report.retirement=await closeTestBrowser(browser,family);await new Promise(resolve=>server.close(resolve));await writeFile(path.join(work,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('Evidence:',path.join(work,'report.json'));}
