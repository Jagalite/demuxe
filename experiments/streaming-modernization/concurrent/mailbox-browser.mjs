// SPDX-License-Identifier: Apache-2.0
// Real Fetch/I/O worker protocol tests; native mailbox producer is simulated.
import {chromium,firefox} from 'playwright';import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const web=path.resolve(process.env.TRANSPORT_WEB),out=path.resolve(process.env.OUT),family=process.env.BROWSER??'chrome';await mkdir(out);
const requests=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer(async(req,res)=>{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'}))res.setHeader(k,v);
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Mailbox test</title>');return;}
 if(u.pathname==='/root.m3u8'){res.end('#EXTM3U\n#EXT-X-TARGETDURATION:12\n#EXTINF:12,\nlarge.ts\n#EXT-X-ENDLIST\n');return;}
 if(['/large.ts','/slow.ts','/fresh.ts','/truncated.ts','/stalled.ts'].includes(u.pathname)){
  const r={url:u.pathname,sent:0,completed:false,aborted:false};requests.push(r);res.on('close',()=>r.aborted=!r.completed);
  if(u.pathname==='/truncated.ts')res.setHeader('Content-Length',4096);
  const length=u.pathname==='/large.ts'?12*1024*1024:u.pathname==='/truncated.ts'?1024:65536;
  res.flushHeaders();for(let at=0;at<length;at+=1024){if(u.pathname==='/slow.ts'&&at>0)await delay(150);if(u.pathname==='/stalled.ts'&&at>0)await delay(3000);if(res.destroyed)return;res.write(Buffer.alloc(Math.min(1024,length-at),u.pathname==='/fresh.ts'?73:29));r.sent+=Math.min(1024,length-at);if(u.pathname==='/large.ts'&&at%65536===0)await delay(1);}
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
  const stride=266328,memory=new SharedArrayBuffer(stride*4);
  window.lanes=Array.from({length:4},(_,i)=>({header:new Int32Array(memory,i*stride,16),view:new DataView(memory,i*stride,64),extra:new DataView(memory,i*stride+262208,24),payload:new Uint8Array(memory,i*stride+64,262144),url:new Uint8Array(memory,i*stride+262232,4096)}));
  Atomics.store(lanes[0].header,6,0x444d5802);Atomics.store(lanes[0].header,7,4);
  window.messages=[];window.serial=0;window.worker=new Worker('/instrumented-io-worker.js',{type:'module'});
  await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{messages.push(data);if(data.type==='ready')resolve(data.info);if(data.type==='error')reject(Error(data.message));};worker.postMessage({type:'init',memory,pointer:0,options:{url:location.origin+'/root.m3u8',format:'hls'}});});
  for(const lane of lanes)Atomics.store(lane.header,2,1);
  worker.postMessage({type:'activate',session:1});
  window.wait=async fn=>{const end=performance.now()+12000;while(!fn()){if(performance.now()>end)throw Error('Mailbox wait timed out');await new Promise(r=>setTimeout(r,2));}};
  window.begin=(index,operation,id=0,offset=0n,capacity=262144,url='')=>{
    const lane=lanes[index],ticket=++serial*8+1,h=lane.header;
    Atomics.store(h,1,serial);Atomics.store(h,15,operation);lane.extra.setInt32(0,id,true);
    lane.extra.setBigInt64(8,-1n,true);lane.extra.setBigInt64(16,-1n,true);
    lane.view.setBigUint64(32,offset,true);Atomics.store(h,4,capacity);lane.url.fill(0);lane.url.set(new TextEncoder().encode(url));
    Atomics.store(h,0,ticket);Atomics.notify(h,0);return ticket;
  };
  window.finish=async(index,ticket)=>{
    const lane=lanes[index],h=lane.header;await wait(()=>[ticket+1,ticket+2].includes(Atomics.load(h,0)));
    const n=Atomics.load(h,5),result={code:n,bytes:n>0?Array.from(lane.payload.slice(0,Math.min(n,262144))):[]};
    Atomics.store(h,0,0);Atomics.notify(h,0);return result;
  };
  window.request=async(index,...args)=>finish(index,begin(index,...args));
 });
 const independent=await page.evaluate(async()=>{
  const active=await request(1,1,0,0n,262144,location.origin+'/fresh.ts');
  const candidate=await request(2,1,0,0n,262144,location.origin+'/stalled.ts');
  let n=0;while(n<1024){const r=await request(2,2,candidate.code,BigInt(n),512);if(r.code<=0)throw Error('Candidate prefix failed');n+=r.code;}
  const held=begin(2,2,candidate.code,1024n,1024);await new Promise(r=>setTimeout(r,30));
  const started=performance.now();let consumed=0;
  while(consumed<65536){const r=await request(1,2,active.code,BigInt(consumed),4096);if(r.code<=0||r.bytes.some(b=>b!==73))throw Error('Active read corrupted');consumed+=r.code;}
  const milliseconds=performance.now()-started,pending=Atomics.load(lanes[2].header,0)===held;
  const h=lanes[2].header;if(Atomics.compareExchange(h,0,held,held+3)!==held)throw Error('Candidate must remain pending');
  Atomics.add(h,3,1);Atomics.notify(h,3);Atomics.store(h,0,held+4);Atomics.notify(h,0);
  await request(2,3,candidate.code);
  // Closing a cancelled candidate must leave the active handle valid at EOF.
  const eof=await request(1,2,active.code,BigInt(consumed),1);await request(1,3,active.code);
  return {consumed,milliseconds,pending,eof:eof.code,errors:messages.filter(m=>m.type==='error')};
 });
 assert.equal(independent.consumed,65536);assert.equal(independent.pending,true);assert.equal(independent.eof,0);
 assert.ok(independent.milliseconds<1500);assert.deepEqual(independent.errors,[]);
 result.checks.push({name:'active lane progresses while candidate waits; scoped cancellation',passed:true,...independent});
 const closed=await page.evaluate(async()=>{
  worker.postMessage({type:'close'});await wait(()=>messages.some(m=>m.type==='closed'));
  const message=messages.find(m=>m.type==='closed');worker.terminate();return message;
 });
 assert.equal(closed.pendingWaiters,0);result.checks.push({name:'all mailbox and epoch waits drained',passed:true,...closed});result.passed=true;
}catch(error){result.passed=false;result.error=String(error.stack);result.messages=await page.evaluate(()=>window.messages?.slice(-8)).catch(()=>null);process.exitCode=1;}
finally{await page.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,error:result.error,checks:result.checks}));}
