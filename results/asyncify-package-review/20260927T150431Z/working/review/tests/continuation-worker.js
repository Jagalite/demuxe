// SPDX-License-Identifier: MIT
self.onmessage=async({data})=>{
 const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async fn=>{for(let i=0;i<2000;i++){if(fn())return;await delay(1);}throw Error('barrier timeout');};
 const results={scope:'Freestanding actual-Wasm continuation oracle; no media service',backend:data.backend};
 let accesses=0,createdWorkers=0,s,e,release,callbacks=0,settlements=0;
 let module;
 const pending=[];
 try{
  if(data.backend==='asyncify'){
   for(const key of ['Suspending','promising'])
    Object.defineProperty(WebAssembly,key,{configurable:true,get(){accesses++;throw Error('Unexpected JSPI access');}});
  }
  self.Worker=class{constructor(){createdWorkers++;throw Error('Nested worker prohibited');}};
  s=new CoopScheduler({backend:data.backend});
  module=await WebAssembly.compile(data.bytes);
  const imports=WebAssembly.Module.imports(module);
  expect(imports.every(x=>['demuxe_coop','test','review_io'].includes(x.module)),'unadmitted import');
  const instance=await WebAssembly.instantiate(module,{demuxe_coop:s.imports,test:{now:()=>performance.now()},review_io:{
   value:s.wrapImport('review_io.value',token=>{
    callbacks++;
    if(data.name==='throwing-import-is-terminal')throw Error('injected import fault');
    return s.park(w=>{
     const done=()=>{
      settlements++;
      const first=s.readyWait(w,token*3+5);
      if(data.name==='duplicate-wakeup-is-ignored')expect(first&&!s.readyWait(w,99),'duplicate wake was accepted');
     };
     if(data.name==='synchronous-ready-before-unwind')done();
     else if(data.name==='multi-task-out-of-order')
       setTimeout(done,Math.max(1,(20-token)%7));
     else{pending.push(done);release=done;}
    });
   })
  }});
  e=instance.exports;s.attach(e);
  const run=(name,...args)=>s.run(e[name],...args);
  let discarded=false;
  switch(data.name){
   case 'no-suspension-normal-return':
    expect(await run('probe_no_suspend',17)===24,'wrong non-suspending value');
    expect(s.stats.suspensions===0,'unexpected suspension');break;
   case 'single-suspension-no-placeholder-result':{
    let complete=false;const p=run('probe_once',13).then(v=>{complete=true;return v;});
    await until(()=>callbacks===1);await delay(5);
    expect(!complete&&e.probe_after()===0,'unwind return was treated as completion');
    release();expect(await p===44,'wrong resumed value');
    expect(callbacks===1&&e.probe_entered()===1&&e.probe_after()===1,'continuation side effects repeated');break;
   }
   case 'synchronous-ready-before-unwind':
   case 'duplicate-wakeup-is-ignored':{
    const p=run('probe_once',7);if(data.name!=='synchronous-ready-before-unwind'){await until(()=>callbacks===1);release();}
    expect(await p===26&&e.probe_after()===1&&callbacks===1,'ready/replay failure');break;
   }
   case 'nested-C-stacks-survive':
   case 'memory-growth-with-saved-continuation':{
    const p=run('probe_recursive',80,11);await until(()=>callbacks===1);
    if(data.name==='memory-growth-with-saved-continuation')e.memory.grow(1);
    release();expect(await p===(11+80)*3+5,'nested result changed');break;
   }
   case 'multi-task-out-of-order':{
    const values=await Promise.all(Array.from({length:8},(_,i)=>run('probe_recursive',20,i)));
    expect(values.every((v,i)=>v===(i+20)*3+5),'logical task result mixed');
    expect(callbacks===8&&e.probe_entered()===8&&e.probe_after()===8,'duplicate multi-task execution');break;
   }
   case 'indirect-callback-instrumented':{
    const p=run('probe_indirect',1,12);await until(()=>callbacks===1);
    release();expect(await p===44,'indirect return value');
    expect(e.probe_entered()===2&&e.probe_after()===2&&callbacks===1,'continuation side effects repeated');break;
   }
   case 'C-negative-result-is-not-runtime-failure':{
    const p=run('probe_once',-2);await until(()=>callbacks===1);release();
    expect(await p===-1,'signed C error lost');expect(await run('probe_no_suspend',1)===8&&!s.stopped,'C result poisoned runtime');break;
   }
   case 'throwing-import-is-terminal':{
    let error;try{await run('probe_once',1);}catch(x){error=x;}
    expect(String(error).includes('injected import fault')&&s.stopped,'import fault was not fatal');
    await run('probe_no_suspend',1).then(()=>{throw Error('poisoned scheduler reused');},()=>{});
    discarded=true;break;
   }
   case 'trap-after-resume-is-terminal':{
    let error;const p=run('probe_trap',1).catch(x=>{error=x;});
    await until(()=>callbacks===1);release();await p;
    expect(error instanceof WebAssembly.RuntimeError&&s.stopped,'trap did not poison runtime');
    discarded=true;break;
   }
   case 'abandon-pending-task-rejects-late-resume':{
    let error;const p=run('probe_once',1).catch(x=>{error=x;});
    await until(()=>callbacks===1);s.close(Error('deliberate abandon'));await p;
    release();await delay(5);
    expect(String(error).includes('deliberate abandon')&&e.probe_after()===0,'abandoned C resumed');
    expect(s.stats.completed===0&&s.stats.abandoned===1,'abandon misreported as teardown');
    discarded=true;break;
   }
   case 'saved-stack-canary-is-fatal':{
    expect(data.backend==='asyncify','Asyncify-only case');
    let error;const p=run('probe_once',1).catch(x=>{error=x;});
    await until(()=>callbacks===1);
    const task=[...s.tasks.values()].find(t=>t.status==='waiting');
    new Uint8Array(e.memory.buffer)[task.asyncify.hi]=0;
    release();await p;
    expect(String(error).includes('Asyncify stack canary corrupted')&&s.stopped,'saved guard not enforced');
    discarded=true;break;
   }
   case 'undersized-saved-stack-fails-closed':{
    let error;const p=run('probe_recursive',80,11).catch(x=>{error=x;});
    // Overflow may trap while unwinding, before any asynchronous callback.
    await until(()=>s.stopped||callbacks===1);if(!s.stopped)release();await p;
    expect((error instanceof WebAssembly.RuntimeError||/Asyncify.*(?:bounds|canary)/i.test(String(error)))&&s.stopped,'undersized saved stack not rejected');
    discarded=true;break;
   }
   default:throw Error('Unknown review case');
  }
  const stats=s.snapshot();
  expect(stats.liveTasks===0&&stats.retainedTasks===0&&stats.waitKeys===0&&stats.timers===0,'scheduler resources retained');
  expect(discarded?stats.stopped&&stats.freeSlots===0:!stats.stopped&&stats.freeSlots===24,'incorrect reuse state');
  expect(!crossOriginIsolated&&typeof SharedArrayBuffer==='undefined'&&e.memory.buffer instanceof ArrayBuffer,'non-isolation contract failed');
  expect(accesses===0&&createdWorkers===0,'hidden JSPI/Worker dependency');
  results.ok=true;results.stats=stats;results.discarded=discarded;
 }catch(error){results.ok=false;results.error=String(error.stack??error);results.stats=s?.snapshot();}
 finally{
  results.jspiGetterAccesses=accesses;results.jspiDisabled=data.backend==='asyncify';
  results.nestedWorkersCreated=createdWorkers;results.crossOriginIsolated=crossOriginIsolated;
  results.sharedArrayBufferAvailable=typeof SharedArrayBuffer!=='undefined';
  results.memoryType=e?.memory.buffer.constructor.name??null;
  results.callbacks=callbacks;results.settlements=settlements;
  s?.close();self.postMessage(results);
 }
};
