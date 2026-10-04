// SPDX-License-Identifier: Apache-2.0
/** Diagnostic evidence only. A stale-looking debugger entry never passes the
 * caller's strict zero-worker gate; timeout/rejected probes alone prove no leak. */
export function classifyWorkerProbe(probe,targetPresent){
 if(probe.status==='runnable')return 'runnable';
 if(targetPresent===true)return 'target-still-reported';
 if(probe.status==='rejected'&&targetPresent===false)return 'execution-unavailable-target-absent';
 return 'indeterminate';
}
export async function boundedObservation(work,timeout=500){
 let timer;try{return await Promise.race([Promise.resolve().then(work).then(value=>({status:'fulfilled',value}),error=>({status:'rejected',error:String(error)})),new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'timeout'}),timeout);})]);}finally{clearTimeout(timer);}
}
export function observeWorkerCleanup(page,{chromium=false,now=Date.now,timeout=500}={}){
 let serial=0,dropped=0;const ids=new Map(),listeners=new Map(),events=[];
 const record=event=>{if(events.length<512)events.push({...event,at:now()});else dropped++;};
 const created=worker=>{if(ids.size>=256){dropped++;return;}const id=++serial;ids.set(worker,id);record({kind:'created',id,url:worker.url()});const closed=()=>{record({kind:'closed',id,url:worker.url()});ids.delete(worker);listeners.delete(worker);};listeners.set(worker,closed);worker.once('close',closed);};
 page.on('worker',created);for(const worker of page.workers())created(worker);
 return{
  async captureOwners(){await page.evaluate(()=>{
   globalThis.__demuxeCleanupOwners=[['viewer',globalThis.viewer?.player],['custom',globalThis.custom]].flatMap(([label,player])=>player?.current?.backend?[{label,backend:player.current.backend}]:[]);
  });},
  async collect(){
   // Capture survivors before any supplementary probe; later closure cannot erase
   // the original failure. All host observations run concurrently under one cap.
   const at=now(),workers=page.workers(),selected=workers.slice(0,16);
   const ownerWork=boundedObservation(()=>page.evaluate(()=>({owners:(globalThis.__demuxeCleanupOwners??[]).map(({label,backend})=>({label,phase:backend.lifecycle?.phase,iframeConnected:backend.workerOwner?.isConnected,contextState:backend.audioContext?.state})),connectedIframes:document.querySelectorAll('iframe').length})),timeout);
   const targetWork=chromium&&workers.length?boundedObservation(async()=>{const session=await page.context().newCDPSession(page);try{return await session.send('Target.getTargets');}finally{void session.detach().catch(()=>{});}},timeout):Promise.resolve({status:'unavailable'});
   const probes=await Promise.all(selected.map(async worker=>{const id=ids.get(worker),url=worker.url();const result=await boundedObservation(()=>worker.evaluate(()=>({url:location.href,now:performance.now()})),timeout);return{id,url,probe:result.status==='fulfilled'?{status:'runnable',value:result.value}:result};}));
   const [owners,targets]=await Promise.all([ownerWork,targetWork]);
   return{at,workersAtObservation:workers.length,unprobed:workers.length-selected.length,events:[...events],dropped,owners,targets,workers:probes.map(row=>({...row,classification:classifyWorkerProbe(row.probe,targets.status==='fulfilled'?targets.value.targetInfos.some(target=>target.type==='worker'&&target.url===row.url):undefined)}))};
  },
  dispose(){page.off('worker',created);for(const [worker,closed]of listeners)worker.off('close',closed);listeners.clear();ids.clear();},
 };
}
