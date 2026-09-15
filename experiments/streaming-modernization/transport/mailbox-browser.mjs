// Real Fetch/I/O worker protocol tests; native mailbox producer is simulated.
import {chromium,firefox} from 'playwright';import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const web=path.resolve(process.env.TRANSPORT_WEB),out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';await mkdir(out);
const requests=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer(async(req,res)=>{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Mailbox test</title>');return;}
 if(u.pathname==='/root.m3u8'){res.end('#EXTM3U\n#EXT-X-TARGETDURATION:12\n#EXTINF:12,\nlarge.ts\n#EXT-X-ENDLIST\n');return;}
 if(['/large.ts','/slow.ts','/fresh.ts','/truncated.ts'].includes(u.pathname)){
  const r={url:u.pathname,sent:0,completed:false,aborted:false};requests.push(r);res.on('close',()=>r.aborted=!r.completed);
  if(u.pathname==='/truncated.ts')res.setHeader('Content-Length',4096);
  const length=u.pathname==='/large.ts'?12*1024*1024:u.pathname==='/truncated.ts'?1024:65536;
  res.flushHeaders();for(let at=0;at<length;at+=1024){if(u.pathname==='/slow.ts'&&at>0)await delay(150);if(res.destroyed)return;res.write(Buffer.alloc(Math.min(1024,length-at),u.pathname==='/fresh.ts'?73:29));r.sent+=Math.min(1024,length-at);if(u.pathname==='/large.ts'&&at%65536===0)await delay(1);}
  r.completed=true;if(u.pathname==='/truncated.ts')res.destroy();else res.end();return;
 }
 try{const f=path.resolve(web,u.pathname==='/instrumented-io-worker.js'?'io-worker.js':u.pathname.slice(1));if(!f.startsWith(web+path.sep))throw Error();res.setHeader('Content-Type','text/javascript');const source=await readFile(f);res.end(u.pathname==='/instrumented-io-worker.js'?`let probeWaits=0;const probeWait=Atomics.waitAsync?.bind(Atomics);if(probeWait)Atomics.waitAsync=(...args)=>{const result=probeWait(...args);if(!result.async)return result;probeWaits++;return {async:true,value:result.value.finally(()=>probeWaits--)};};const probePost=self.postMessage.bind(self);self.postMessage=(data,...rest)=>probePost(data.type==='closed'?{...data,pendingWaiters:probeWaits}:data,...rest);\n`+source:source);}catch{res.writeHead(404).end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await({chrome:chromium,firefox})[family].launch({headless:true,...(family==='chrome'?{channel:'chrome'}:{})});
const result={scope:'Browser Fetch and I/O mailbox; simulated native producer, no playback claim',family,browser:browser.version(),requests,checks:[],hashes:{}};
for(const name of ['io-worker.js','resource-loader.js','incremental-transport.js','legacy-manifest-adapter.js'])result.hashes[name]=createHash('sha256').update(await readFile(path.join(web,name))).digest('hex');
const page=await browser.newPage();page.setDefaultTimeout(15000);
try{
 await page.goto(origin);await page.evaluate(async()=>{
  const memory=new SharedArrayBuffer(262232+4096);window.h=new Int32Array(memory,0,16);window.view=new DataView(memory);window.payload=new Uint8Array(memory,64,262144);window.extra=new DataView(memory,262208,24);window.urlBytes=new Uint8Array(memory,262232,4096);window.messages=[];window.serial=0;
  window.worker=new Worker('/instrumented-io-worker.js',{type:'module'});
  window.root=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{messages.push(data);if(data.type==='ready')resolve(data.info);if(data.type==='error')reject(Error(data.message));};worker.postMessage({type:'init',memory,pointer:0,options:{url:location.origin+'/root.m3u8',format:'hls'}});});
  // A new Fetch worker must not execute any old session's pending mailbox.
  Atomics.store(h,0,9);await new Promise(r=>setTimeout(r,30));
  if(Atomics.load(h,0)!==9)throw Error('Mailbox pumped before session activation');
  Atomics.store(h,0,0);Atomics.store(h,2,1);worker.postMessage({type:'activate',session:1});
  window.wait=async fn=>{const end=performance.now()+12000;while(!fn()){if(performance.now()>end)throw Error('Mailbox wait timed out');await new Promise(r=>setTimeout(r,2));}};
  window.begin=(operation,id=0,offset=0n,capacity=262144,url='')=>{const ticket=++serial*8+1;Atomics.store(h,1,serial);Atomics.store(h,15,operation);extra.setInt32(0,id,true);extra.setBigInt64(8,-1n,true);extra.setBigInt64(16,-1n,true);view.setBigUint64(32,offset,true);Atomics.store(h,4,capacity);urlBytes.fill(0);urlBytes.set(new TextEncoder().encode(url));Atomics.store(h,0,ticket);Atomics.notify(h,0);return ticket;};
  window.finish=async ticket=>{await wait(()=>[ticket+1,ticket+2].includes(Atomics.load(h,0)));const n=Atomics.load(h,5);const r={code:n,bytes:n>0?Array.from(payload.slice(0,Math.min(n,262144))):[],size:view.getBigInt64(40,true).toString(),seekable:!!extra.getInt32(4,true)};Atomics.store(h,0,0);Atomics.notify(h,0);return r;};
  window.request=async(...args)=>finish(begin(...args));
 });
 const root=await page.evaluate(()=>request(2,root.resource,0n,7));assert.equal(new TextDecoder().decode(Uint8Array.from(root.bytes)),'#EXTM3U');result.checks.push({name:'root manifest',passed:true});
 const large=await page.evaluate(async()=>{const info=await request(1,0,0n,262144,location.origin+'/large.ts');let n=0,calls=0,first;for(;;){const r=await request(2,info.code,BigInt(n));if(!first)first=r.code;if(r.code<0)throw Error('Read failed '+r.code);if(!r.code)break;n+=r.code;calls++;}await request(3,info.code);return {size:info.size,seekable:info.seekable,n,calls,first,stats:messages.filter(m=>m.type==='stats').at(-1)?.stats};});
 assert.equal(large.n,12*1024*1024);assert.equal(large.seekable,false);assert.equal(large.size,'-1');assert.ok(large.calls>48);result.checks.push({name:'progressive large unknown length',passed:true,...large});
 const cancelled=await page.evaluate(async()=>{
  const info=await request(1,0,0n,262144,location.origin+'/slow.ts');let n=0;
  while(n<1024){const r=await request(2,info.code,BigInt(n),512);n+=r.code;}
  const ticket=begin(2,info.code,BigInt(n),1024);await new Promise(r=>setTimeout(r,20));
  const reserved=Atomics.compareExchange(h,0,ticket,ticket+3);if(reserved!==ticket)throw Error('Expected outstanding read');Atomics.add(h,3,1);Atomics.notify(h,3);Atomics.store(h,0,ticket+4);Atomics.notify(h,0);
  await new Promise(r=>setTimeout(r,20));await request(3,info.code);
  const next=await request(1,0,0n,262144,location.origin+'/fresh.ts');const fresh=await request(2,next.code,0n,512);await request(3,next.code);return {code:fresh.code,allFresh:fresh.bytes.every(b=>b===73),errors:messages.filter(m=>m.type==='error')};
 });assert.equal(cancelled.allFresh,true);assert.equal(cancelled.code,512);assert.deepEqual(cancelled.errors,[]);result.checks.push({name:'cancelled ticket cannot publish into next resource',passed:true,...cancelled});
 const closed=await page.evaluate(async()=>{worker.postMessage({type:'close'});await wait(()=>messages.some(m=>m.type==='closed'));const closed=messages.find(m=>m.type==='closed');worker.terminate();return closed;});
 assert.equal(closed.pendingWaiters,0,'Close acknowledgement must retire asynchronous waiters before termination');
 result.checks.push({name:'close drains asynchronous waiters',passed:true,...closed});result.passed=true;
}catch(error){result.passed=false;result.error=String(error.stack);result.messages=await page.evaluate(()=>window.messages?.slice(-6)).catch(()=>null);process.exitCode=1;}
finally{await page.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,error:result.error,checks:result.checks.map(c=>c.name)}));}
