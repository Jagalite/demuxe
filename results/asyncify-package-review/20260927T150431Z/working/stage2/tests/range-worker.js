// SPDX-License-Identifier: MIT
self.onmessage=async ({data})=>{
 const started=performance.now(),delay=ms=>new Promise(r=>setTimeout(r,ms));
 let ticks=0,entered=0,resolveRead,requestAborted=false,details={},e,imports=[],nestedWorkersCreated=0;
 const tick=setInterval(()=>ticks++,2);
 const s=new CoopScheduler({backend:data.backend}),r=new RangeSource(s,{timeoutMs:1000});
 const pattern=(offset,n)=>Uint8Array.from({length:n},(_,i)=>((offset+i)*73+17)%256);
 const sourceBytes=pattern(0,8192),blob=new Blob([sourceBytes]);
 const expect=(x,msg)=>{if(!x)throw Error(msg);};
 const until=async (fn)=>{for(let i=0;i<1000;i++){if(fn())return;await delay(1);}throw Error('barrier timeout');};
 try {
  self.Worker=class {constructor(){nestedWorkersCreated++;throw Error('Nested Worker creation prohibited');}};
  const module=await WebAssembly.compile(data.bytes);imports=WebAssembly.Module.imports(module);
  expect(imports.every(x=>['demuxe_coop','demuxe_source','test'].includes(x.module)),'Unexpected imports');
  ({exports:e}=await WebAssembly.instantiate(module,{demuxe_coop:s.imports,demuxe_source:r.imports,test:{
   now:()=>performance.now(),fail:(a,b,l)=>{throw Error(`C assertion ${s.readString(a)} at ${s.readString(b)}:${l}`);}
  }}));
  s.attach(e);r.attach(e.memory);
  const run=(fn,...args)=>s.run(e[fn],...args);
  const ptr=e.bridge_ptr(),out=(n=1024,offset=0)=>new Uint8Array(e.memory.buffer,ptr+offset,n);
  const exact=(got,want)=>{expect(got.length===want.length&&got.every((v,i)=>v===want[i]),'Byte mismatch');};
  const blank=(n=1024)=>expect(out(n).every(x=>x===0xcc),'Unexpected heap write');
  const close=async id=>{await run('bridge_close',id);};
  const pendingReader={size:8192,read:(offset,count,signal)=>{entered++;signal.addEventListener('abort',()=>requestAborted=true,{once:true});return new Promise(resolve=>{resolveRead=()=>resolve(pattern(offset,count));});}};
  r.setSource(blob);await run('bridge_setup');await run('bridge_fill');
  await run('bridge_open',0);
  switch(data.name) {
   case 'real-blob-read-seek-eof': {
    expect(await run('bridge_size',0)===8192,'size');expect(await run('bridge_seek',0,37n)===37n,'seek');
    expect(await run('bridge_read',0,0,173)===173,'read');exact(out(173),sourceBytes.slice(37,210));
    expect(await run('bridge_seek',0,8192n)===8192n,'seek eof');expect(await run('bridge_read',0,0,100)===0,'EOF');break;
   }
   case 'short-read-retry': {
    await close(0);r.setSource({size:103,read:async(offset,n)=>pattern(offset,Math.min(n,11,103-offset))});await run('bridge_open',0);
    let n=0;while(n<103){const got=await run('bridge_read',0,n,103-n);expect(got>0,'progress');n+=got;}
    expect(await run('bridge_read',0,103,1)===0,'EOF');exact(out(103),pattern(0,103));break;
   }
   case 'seek-boundaries': {
    expect(await run('bridge_seek',0,-1n)<0n,'negative accepted');expect(await run('bridge_seek',0,8193n)<0n,'beyond EOF');
    expect(await run('bridge_seek',0,0n)===0n,'reset');break;
   }
   case 'two-handle-independent-positions': {
    await run('bridge_open',1);await run('bridge_seek',1,733n);
    const got=await Promise.all([run('bridge_read',0,0,173),run('bridge_read',1,512,91)]);
    expect(got[0]===173&&got[1]===91,'reads');exact(out(173),pattern(0,173));exact(out(91,512),pattern(733,91));await close(1);break;
   }
   case 'cancel-observed-pending-read-late-completion':
   case 'source-replacement-drops-stale-read':
   case 'close-during-pending-read': {
    await close(0);r.setSource(pendingReader);await run('bridge_open',0);
    const p=run('bridge_read',0,0,256);await until(()=>entered===1 && r.requests.size===1);
    details.pendingReadBarrier=true;
    if(data.name==='close-during-pending-read')await close(0);else r.cancelSource();
    expect(await p===-1,'read not cancelled');expect(requestAborted,'AbortSignal not fired');blank();
    if(data.name!=='close-during-pending-read')await close(0);
    const newBytes=Uint8Array.from({length:8192},()=>19);
    r.setSource(new Blob([newBytes]));await run('bridge_open',0);
    expect(await run('bridge_read',0,0,256)===256,'new read');
    resolveRead();await delay(30);exact(out(256),newBytes.slice(0,256));break;
   }
   case 'cancel-after-ready-before-c-owner-resume': {
    let revoked=false;const schedule=s.schedule.bind(s);
    s.schedule=()=>{if(!revoked&&s.ready.some(t=>t.status==='ready'&&t.resumeAction)){revoked=true;r.cancelSource();}schedule();};
    expect(await run('bridge_read',0,0,256)===-1,'ready read not revoked');expect(revoked,'barrier not reached');blank();break;
   }
   case 'memory-growth-while-read-suspended': {
    await close(0);r.setSource(pendingReader);await run('bridge_open',0);
    const old=e.memory.buffer,p=run('bridge_read',0,0,256);await until(()=>entered===1);
    e.memory.grow(2);expect(old.byteLength===0,'old view did not detach');resolveRead();
    expect(await p===256,'grown memory read');exact(out(256),pattern(0,256));details.grewPages=2;break;
   }
   case 'reader-rejection-unwinds-c':
   case 'premature-zero-rejected':
   case 'oversized-reader-result-rejected': {
    await close(0);r.setSource({size:8192,read:async(offset,n)=>{
     if(data.name==='reader-rejection-unwinds-c')throw Error('injected read failure');
     return new Uint8Array(data.name==='premature-zero-rejected'?0:n+1);
    }});await run('bridge_open',0);expect(await run('bridge_read',0,0,256)===-1,'bad result accepted');blank();break;
   }
   case 'numeric-count-reader-rejected':
   case 'nan-reader-rejected':
   case 'infinity-reader-rejected': {
    await close(0);r.setSource({size:8192,read:async()=>data.name==='numeric-count-reader-rejected'?128:data.name==='nan-reader-rejected'?NaN:Infinity});
    await run('bridge_open',0);expect(await run('bridge_read',0,0,256)===-1,'numeric reader success without bytes');blank();break;
   }
   case 'ready-reader-buffer-snapshotted': {
    const bytes=pattern(0,256);await close(0);r.setSource({size:8192,read:async()=>bytes});await run('bridge_open',0);
    let mutated=false;const schedule=s.schedule.bind(s);
    s.schedule=()=>{if(!mutated&&s.ready.some(t=>t.status==='ready'&&t.resumeAction)){mutated=true;bytes.fill(19);}schedule();};
    expect(await run('bridge_read',0,0,256)===256,'snapshot read');expect(mutated,'snapshot barrier');exact(out(256),pattern(0,256));break;
   }
   case 'cancel-before-reader-call-avoids-work': {
    await close(0);r.setSource({size:8192,read:async()=>{entered++;return pattern(0,256);}});await run('bridge_open',0);
    let cancelled=false;const schedule=s.schedule.bind(s);
    s.schedule=()=>{if(!cancelled&&r.requests.size&&[...s.tasks.values()].some(t=>t.status==='waiting')){cancelled=true;r.cancelSource();}schedule();};
    expect(await run('bridge_read',0,0,256)===-1,'pre-call cancellation');expect(cancelled&&entered===0,'cancelled reader invoked');blank();break;
   }
   case 'invalid-resource-limits-rejected': {
    for(const opts of [{maxPending:NaN},{maxPending:0},{maxPending:65},{maxChunk:0},{maxChunk:Infinity},{maxChunk:262145}]) {
      let rejected=false;try{new RangeSource(s,opts);}catch{rejected=true;}expect(rejected,'invalid resource limit accepted');
    }break;
   }
   case 'host-stack-restored-while-suspended': {
    const host=s.hostSP;await close(0);r.setSource(pendingReader);await run('bridge_open',0);
    const read=run('bridge_read',0,0,256);await until(()=>entered===1);
    expect((e.demuxe_coop_get_sp()>>>0)===host,'host stack not restored at suspend');resolveRead();expect(await read===256,'read');
    expect((e.demuxe_coop_get_sp()>>>0)===host,'host stack not restored at finish');break;
   }
   case 'stack-slot-abi-mismatch-rejected': {
    const wrong=new CoopScheduler({slots:1,backend:data.backend});let rejected=false;
    try{wrong.attach(e);}catch(error){rejected=String(error).includes('ABI mismatch');}finally{wrong.close();}
    expect(rejected,'JS/C stack slot mismatch accepted');break;
   }
   case 'reader-error-preserved-for-host-classification': {
    const cause=new Error('injected typed reader error');cause.code='SOURCE_PERMISSION';
    await close(0);r.setSource({size:8192,read:async()=>{throw cause;}});await run('bridge_open',0);
    expect(await run('bridge_read',0,0,128)===-1,'reader error result');const evidence=r.drainFailures();
    expect(evidence.length===1&&evidence[0].cause===cause&&evidence[0].kind==='reader','reader cause lost');
    expect(!JSON.stringify(r.snapshot()).includes('injected typed'),'error text exposed in snapshot');blank();break;
   }
   case 'pending-read-deadline': {
    await close(0);r.timeoutMs=40;r.setSource({size:8192,read:()=>{entered++;return new Promise(()=>{});}});await run('bridge_open',0);
    expect(await run('bridge_read',0,0,256)===-1,'timeout not returned');expect(entered===1&&r.stats.timeouts===1,'real read timeout not observed');blank();break;
   }
   case 'cancelled-handle-cannot-read-or-seek': {
    await run('bridge_cancel',0);expect(await run('bridge_read',0,0,8)===-1,'read survived');expect(await run('bridge_seek',0,0n)<0n,'seek revived source');blank();break;
   }
   case 'cancel-one-handle-other-survives': {
    await run('bridge_open',1);await run('bridge_cancel',0);expect(await run('bridge_read',0,0,8)===-1,'cancel');
    expect(await run('bridge_read',1,0,173)===173,'other handle cancelled');exact(out(173),pattern(0,173));await close(1);break;
   }
   case 'source-generation-cannot-revive-old-handle': {
    r.setSource(blob);expect(await run('bridge_read',0,0,8)===-1,'stale handle');expect(await run('bridge_seek',0,0n)<0n,'stale seek');
    await run('bridge_open',1);expect(await run('bridge_read',1,0,173)===173,'new handle');await close(1);break;
   }
   case 'large-safe-offset-addressing': {
    await close(0);r.setSource({size:2**32+8192,read:async(offset,n)=>pattern(offset,n)});await run('bridge_open',0);
    const at=2**32+733;expect(await run('bridge_seek',0,BigInt(at))===BigInt(at),'64-bit seek');
    expect(await run('bridge_read',0,0,173)===173,'large-offset read');exact(out(173),pattern(at,173));break;
   }
   case '100-open-read-close-cycles': {
    await close(0);for(let i=0;i<100;i++){r.setSource(blob);await run('bridge_open',0);expect(await run('bridge_read',0,0,173)===173,'read');await close(0);}
    r.setSource(blob);await run('bridge_open',0);break;
   }
   case 'pending-read-budget-enforced': {
    await close(0);r.setSource({size:8192,read:()=>{entered++;return new Promise(()=>{});}});
    for(let i=0;i<9;i++)await run('bridge_open',i);
    const ps=Array.from({length:8},(_,i)=>run('bridge_read',i,512*i,100));await until(()=>entered===8);
    expect(await run('bridge_read',8,4096,100)===-1,'pending limit');r.cancelSource();
    expect((await Promise.all(ps)).every(x=>x===-1),'cancel all');for(let i=1;i<9;i++)await close(i);blank();break;
   }
   case 'seek-while-read-pending-rejected': {
    await close(0);r.setSource(pendingReader);await run('bridge_open',0);const p=run('bridge_read',0,0,173);await until(()=>entered===1);
    expect(await run('bridge_seek',0,100n)<0n,'concurrent seek accepted');resolveRead();expect(await p===173,'read');exact(out(173),pattern(0,173));break;
   }
   case 'unadmitted-uri-fails-closed': {expect(await run('bridge_bad_uri')<0,'URI accepted');break;}
   default:throw Error('Unknown case '+data.name);
  }
  await close(0);await delay(3);
  expect(e.demuxe_source_live()===0,'C cookie leak');const rs=r.snapshot();
  expect(rs.handles===0 && rs.pending===0 && rs.timers===0,'source resources leaked '+JSON.stringify(rs));
  const ss=s.snapshot();expect(ss.liveTasks===0&&ss.retainedTasks===0&&ss.waitKeys===0&&ss.timers===0&&ss.freeSlots===24,'scheduler leak');
  expect(!self.crossOriginIsolated&&typeof SharedArrayBuffer==='undefined'&&e.memory.buffer instanceof ArrayBuffer,'isolation assertion');
  r.close();s.close();clearInterval(tick);
  self.postMessage({name:data.name,ok:true,scope:'new C mpv callback bridge with registration shim; NOT libmpv/media execution',
   crossOriginIsolated:self.crossOriginIsolated,sharedArrayBufferAvailable:typeof SharedArrayBuffer!=='undefined',memoryType:e.memory.buffer.constructor.name,
   elapsedMs:performance.now()-started,heartbeatTicks:ticks,entered,requestAborted,details,source:rs,scheduler:ss,imports,nestedWorkersCreated,cLiveCookies:e.demuxe_source_live()});
 }catch(error){r.close();s.close();clearInterval(tick);self.postMessage({name:data.name,ok:false,error:String(error.stack??error),source:r.snapshot(),scheduler:s.snapshot(),imports,nestedWorkersCreated,
    crossOriginIsolated:self.crossOriginIsolated,sharedArrayBufferAvailable:typeof SharedArrayBuffer!=='undefined',
    memoryType:e?.memory.buffer.constructor.name});}
};
