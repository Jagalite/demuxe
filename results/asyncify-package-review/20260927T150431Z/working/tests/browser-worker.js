// SPDX-License-Identifier: MIT
self.onmessage=async ({data})=>{
 const started=performance.now();let ticks=0;
 const heartbeat=setInterval(()=>ticks++,2);
 const scheduler=new CoopScheduler({unsafeSharedStack:!!data.unsafeSharedStack,backend:data.backend});
 let pendingReads=0,reads=0,cancelledReads=0,memory,imports=[],nestedWorkersCreated=0;
 const input=new Uint8Array(8192);for(let i=0;i<input.length;i++)input[i]=(i*73+17)%256;
 const blob=new Blob([input]);
 try {
   const nestedWorkerAvailable=typeof Worker;
   // Fail a hidden attempt to substitute real Workers for logical threads.
   self.Worker=class {constructor(){nestedWorkersCreated++;throw Error('Nested Worker creation is forbidden in this test');}};
   const module=await WebAssembly.compile(data.bytes);
   imports=WebAssembly.Module.imports(module);
   const instance=await WebAssembly.instantiate(module,{
     demuxe_coop:scheduler.imports,
     test:{
       now:()=>performance.now(),
       fail:(expr,file,line)=>{throw Error(`C assertion: ${scheduler.readString(expr)} at ${scheduler.readString(file)}:${line}`);},
       live:()=>scheduler.snapshot().liveTasks,
       read:scheduler.wrapImport('test.read',(ptr,offset,size,delayed)=>{
         reads++;pendingReads++;
         return scheduler.park(w=>{
           (async()=>{
             if(delayed)await new Promise(resolve=>setTimeout(resolve,25));
             if(delayed===2){cancelledReads++;return -1;}
             return new Uint8Array(await blob.slice(offset,offset+size).arrayBuffer());
           })().then(bytes=>{
             w.task.resumeAction=()=>{
               pendingReads--;
               if(typeof bytes==='number')return bytes;
               new Uint8Array(instance.exports.memory.buffer).set(bytes,ptr);
               return bytes.length;
             };
             scheduler.readyWait(w,0);
           },error=>scheduler.fail(error));
         });
       })
     }
   });
   memory=instance.exports.memory;scheduler.attach(instance.exports);
   const result=await scheduler.run(instance.exports.test_run,data.which);
   const stats=scheduler.snapshot();
   if(stats.liveTasks||stats.retainedTasks||stats.waitKeys||stats.timers||stats.freeSlots!==24)
     throw Error('Leaked scheduler resources: '+JSON.stringify(stats));
   clearInterval(heartbeat);scheduler.close();
   self.postMessage({name:data.name,which:data.which,ok:result===0,result,
     crossOriginIsolated:self.crossOriginIsolated,
     sharedArrayBufferAvailable:typeof SharedArrayBuffer!=='undefined',
     memoryType:instance.exports.memory.buffer.constructor.name,
     jspi:typeof WebAssembly.Suspending==='function'&&typeof WebAssembly.promising==='function',
     nestedWorkerAvailable,nestedWorkersCreated,imports,
     elapsedMs:performance.now()-started,heartbeatTicks:ticks,reads,pendingReads,cancelledReads,stats});
 }catch(error){
   clearInterval(heartbeat);scheduler.close();
   self.postMessage({name:data.name,which:data.which,ok:false,error:String(error.stack??error),
     crossOriginIsolated:self.crossOriginIsolated,sharedArrayBufferAvailable:typeof SharedArrayBuffer!=='undefined',
     memoryType:memory?.buffer.constructor.name,nestedWorkersCreated,imports,
     elapsedMs:performance.now()-started,heartbeatTicks:ticks,stats:scheduler.snapshot()});
 }
};
