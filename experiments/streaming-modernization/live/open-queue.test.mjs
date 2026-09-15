import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {IncrementalTransport}=await import(pathToFileURL(process.env.TRANSPORT_MODULE).href);
const url='https://media.test/segment';
function setup(t,limits={}){
 const previous=globalThis.fetch, pending=[];let active=0,peak=0;
 globalThis.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{
  active++;peak=Math.max(peak,active);let finished=false;
  const finish=fn=>{if(finished)return;finished=true;active--;signal.removeEventListener('abort',abort);fn();};
  const abort=()=>finish(()=>reject(signal.reason));signal.addEventListener('abort',abort,{once:true});
  pending.push(()=>finish(()=>resolve(new Response(Uint8Array.of(7),{headers:{'Content-Length':'1'}}))));
 });
 const transport=new IncrementalTransport({url},null,{opens:2,stallMs:1000,absoluteMs:2000,...limits});
 t.after(()=>{transport.close();globalThis.fetch=previous;});
 return {transport,pending,get peak(){return peak;}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('queued component opens are FIFO, bounded, and all finish',async t=>{
 const s=setup(t), promises=Array.from({length:7},()=>s.transport.open(url));
 await tick();assert.equal(s.pending.length,2);assert.equal(s.transport.openQueue.length,5);
 for(let i=0;i<7;i++){s.pending[i]();await tick();}
 const handles=await Promise.all(promises);assert.equal(s.peak,2);assert.equal(s.transport.opening,0);assert.equal(s.transport.openQueue.length,0);
 for(const h of handles)s.transport.closeHandle(h.id);
 assert.equal(s.transport.stats.handles,0);
});
test('cancelled queued source cannot begin Fetch or consume a newer slot',async t=>{
 const s=setup(t),a=new AbortController();const first=s.transport.open(url),second=s.transport.open(url);
 const queued=s.transport.open(url,{signal:a.signal});const rejected=assert.rejects(queued,e=>e.kind==='cancelled');
 a.abort();await rejected;await tick();assert.equal(s.pending.length,2);assert.equal(s.transport.openQueue.length,0);
 s.pending[0]();s.pending[1]();await Promise.all([first,second]);assert.equal(s.transport.opening,0);
});
test('closing transport cancels queued and active opens',async t=>{
 const s=setup(t),promises=Array.from({length:7},()=>s.transport.open(url));
 const settled=Promise.allSettled(promises);await tick();s.transport.close();
 assert.ok((await settled).every(r=>r.status==='rejected'&&r.reason.kind==='cancelled'));
 assert.equal(s.transport.openQueue.length,0);assert.equal(s.transport.opening,0);assert.equal(s.transport.stats.handles,0);
});
test('absolute deadline includes time waiting for admission',async t=>{
 const s=setup(t,{absoluteMs:25});const results=await Promise.allSettled(Array.from({length:3},()=>s.transport.open(url)));
 assert.ok(results.every(r=>r.status==='rejected'&&r.reason.kind==='timeout'));assert.equal(s.transport.opening,0);assert.equal(s.transport.openQueue.length,0);
});
