// SPDX-License-Identifier: Apache-2.0
export const liveNetworkCases=['network-inspection-cancel','network-auth-cancel','network-auth-success','network-auth-rejected','network-epoch-reuse','network-retry-success','network-representation-change','network-player-open-cancel','network-player-auth-destroy'];
export async function checkLiveNetwork({scenario,faultOrigin}){
 const {assertExactBytes}=await import('/tests/api-stability/live-check-helpers.mjs');
 const trace=[];globalThis.__liveBoundaryTrace=trace;
 const record=(kind,data={})=>trace.push({at:performance.now(),kind,...data});
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const wait=async predicate=>{const end=performance.now()+8000;while(!await predicate()){if(performance.now()>end)throw Error('Network barrier not reached');await new Promise(r=>setTimeout(r,20));}};
 const file=await(await fetch('/fixtures/example.mp4')).blob(),bytes=new Uint8Array(await file.arrayBuffer());
 record('fixture',{sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('')});
 const id=scenario,url=fault=>`${faultOrigin}/media.mp4?case=${id}&fault=${fault}`;
 const stats=async(release=false)=>await(await fetch(`${faultOrigin}/control?case=${id}${release?'&release=1':''}`)).json();
 const observed=promise=>promise.then(value=>({status:'fulfilled',value}),error=>({status:'rejected',error}));
 const aborted=result=>assert(result.status==='rejected'&&(result.error.name==='AbortError'||result.error.code==='ABORTED'),'Retired operation did not reject as aborted');
 const {inspectMedia,Player}=await import('/web/generated/index.js');
 const {RangeReader}=await import('/web/range-reader.js');
 let player,host,reader,renew;
 const controller=new AbortController();
 try{
  if(scenario==='network-player-open-cancel'||scenario==='network-player-auth-destroy'){
   host=document.createElement('div');document.body.append(host);player=new Player(host,{mode:'native',preview:false});
   const states=[];const stop=player.subscribe(s=>states.push({source:s.sourceId,status:s.status,error:s.error?.code}));
   try{
    const auth=scenario==='network-player-auth-destroy';
    const pending=observed(player.openRemote({url:url(auth?'auth':'hold'),...(auth?{refreshAuthorization:()=>new Promise(resolve=>{renew=resolve;record('refresh-entered');})}:{})},{signal:controller.signal}));
    await wait(async()=>auth?!!renew:(await stats()).requests.length>0);record('request-held');
    if(auth){
     await player.destroy();aborted(await pending);renew({url:url('ok')});
     await new Promise(r=>setTimeout(r,150));assert((await stats()).requests.length===1,'Destroyed player retried with late credentials');
     assert(player.isDestroyed&&host.childElementCount===0,'Old player retained ownership');player=new Player(host,{mode:'native',preview:false});
    }else{controller.abort();aborted(await pending);await wait(async()=>(await stats()).aborted>0);await stats(true);}
    record('open-aborted');await player.open(new File([file],'replacement.mp4',{type:'video/mp4'}));const source=player.state.sourceId;
    assert(source!==null&&!player.state.error,'Replacement source did not settle');
    await player.seek(1);const frame=await player.snapshot({includeSubtitles:false});assert(frame.blob.size>0,'Replacement output missing');
    await new Promise(r=>setTimeout(r,150));assert(player.state.sourceId===source&&!player.state.error,'Late old request contaminated replacement');
    record('replacement-accepted',{source,bytes:frame.blob.size,states});
   }finally{stop();}
  }else if(scenario==='network-epoch-reuse'||scenario==='network-retry-success'||scenario==='network-representation-change'){
   const fault=scenario==='network-epoch-reuse'?'hold':scenario==='network-retry-success'?'retry':'changed';
   reader=new RangeReader({url:url(fault),blockBytes:1024,cacheBytes:2048});
   if(fault==='hold'){
    const pending=observed(reader.read(0n,16));await wait(async()=>(await stats()).requests.length>0);
    reader.beginEpoch();aborted(await pending);assert(!reader.busy&&reader.cache.size===0,'Cancelled bytes retained');await wait(async()=>(await stats()).aborted>0);await stats(true);
    const result=await reader.read(0n,16);assertExactBytes(result,bytes,16,'Replacement epoch returned wrong bytes');
   }else if(fault==='retry'){
    const result=await reader.read(0n,16);assertExactBytes(result,bytes,16,'Retry returned wrong bytes');assert((await stats()).requests.length===2,'Expected exactly one retry');
   }else{
    await reader.read(0n,16);const result=await observed(reader.read(1024n,16));assert(result.status==='rejected'&&/representation changed/.test(result.error.message),'Changed representation did not produce the identity error');assert(reader.peek(1024n,16)===null,'Changed bytes cached');record('identity-rejected',{message:result.error.message});
   }
   assert(!reader.busy,'Transport lane remained occupied');
  }else{
   let refreshing=false;
   const auth=scenario.startsWith('network-auth'),source={url:url(auth?'auth':'hold'),refreshAuthorization:auth?()=>{
    refreshing=true;record('refresh-entered');
    if(scenario==='network-auth-success')return Promise.resolve({url:url('ok')});
    if(scenario==='network-auth-rejected')return Promise.reject(Error('Credential renewal denied'));
    return new Promise(resolve=>{renew=resolve;});
   }:undefined};
   const pending=observed(inspectMedia(source,{signal:controller.signal}));
   if(scenario==='network-auth-success'){
    const result=await pending;assert(result.status==='fulfilled'&&result.value.tracks?.some(t=>t.type==='video'),'Renewed source inspection failed');assert(refreshing,'Authorization path not exercised');record('inspection-accepted',{format:result.value.format});
   }else if(scenario==='network-auth-rejected'){
    const result=await pending;assert(refreshing&&result.status==='rejected','Failed credentials were accepted');assert((await stats()).requests.length===1,'Rejected refresh retried');
   }else{
    await wait(async()=>auth?refreshing:(await stats()).requests.length>0);controller.abort();aborted(await pending);record('inspection-aborted');
    if(auth){renew({url:url('ok')});await new Promise(r=>setTimeout(r,150));assert((await stats()).requests.length===1,'Late credentials started a new request');}else{await wait(async()=>(await stats()).aborted>0);await stats(true);}
   }
   const next=await inspectMedia({url:url('ok')});assert(next.tracks?.some(t=>t.type==='video'),'Successor inspection failed');record('successor-accepted');
  }
  const network=await stats();record('network',network);return {trace,network};
 }finally{controller.abort();reader?.close();await player?.destroy();host?.remove();}
}
