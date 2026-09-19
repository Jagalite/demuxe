// SPDX-License-Identifier: Apache-2.0
// The historical LibAV binary is used ONLY to reproduce its failure. It is not
// copied into the runtime, exported, packaged, or evidence for a new engine.
import {createServer} from 'node:http';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {chromium} from 'playwright';
const vendor=process.env.LAB_VENDOR;
if(!vendor)throw Error('Set LAB_VENDOR to the preserved laboratory web/adapt/vendor directory');
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.end('<!doctype html><title>Timestamp reproducer</title>');return;}
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=pathname.startsWith('/web/adapt/vendor/')?resolve(vendor,basename(pathname)):pathname==='/worker.js'?resolve('results/optimization-integration/reference/web/worker.js'):pathname==='/edge.mkv'?resolve('results/optimization-integration/reference/web/edge.mkv'):pathname.startsWith('/fixtures/')?resolve('build/optimization-fixtures',basename(pathname)):null;
  if(!file){res.writeHead(404);res.end();return;}
  const size=(await stat(file)).size;const range=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'');
  let start=0,end=size-1;if(range){start=+range[1];end=Math.min(+range[2],size-1);res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
  res.setHeader('Content-Length',end-start+1);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type',/\.m?js$/.test(file)?'application/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');
  if(req.method==='HEAD'){res.end();return;}res.end((await readFile(file)).subarray(start,end+1));
 }catch(error){res.writeHead(500);res.end(String(error));}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 const fixtures=JSON.parse(await readFile('results/optimization-integration/fixture-manifest.json','utf8')).map(f=>'/fixtures/'+f.name+'.mkv');fixtures.push('/edge.mkv');
 for(const fixture of fixtures)for(const codec of ['flac','opus']){
  const page=await browser.newPage();await page.goto(origin);const logs=[];page.on('console',m=>logs.push(m.text()));
  const result=await page.evaluate(async({fixture,codec})=>{
   const worker=new Worker('/worker.js');let id=0;
   const call=(type,extra={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker deadline')),15000);worker.onmessage=({data})=>{clearTimeout(timer);resolve(data)};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};worker.postMessage({type,id:++id,gen:1,...extra})});
   try{let reply=await call('init',{url:location.origin+fixture,codec,verifyLossless:codec==='flac'});for(let i=0;i<24&&!reply.error&&!reply.stats?.eof;i++)reply=await call('step');return {error:reply.error,stats:reply.stats};}catch(error){return {error:String(error)}}finally{worker.terminate();}
  },{fixture,codec});results.push({fixture,codec,...result,logs});console.log(fixture,codec,result.error?'FAIL '+result.error.split('\n')[0]:'CONVERTED');await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile('results/optimization-integration/timestamp-reproduction.json',JSON.stringify({scope:'Historical scratch-worker reproduction; not production playback',results},null,2)+'\n');}
