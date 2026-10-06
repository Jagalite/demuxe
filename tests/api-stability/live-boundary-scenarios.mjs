// SPDX-License-Identifier: Apache-2.0
// Shared by the automated matrix and collaborative-browser evaluation.
export const liveBoundaryCases=['preview-success','preview-abort-load','preview-abort-seek','preview-invalid-media','destroy-during-open','destroy-command-burst','hybrid-destroy-during-open','hybrid-destroy-command-burst','software-destroy-during-open','software-destroy-command-burst'];
export async function checkLiveBoundary({scenario,negativeControl=false}){
 const trace=[];globalThis.__liveBoundaryTrace=trace;
 const record=(kind,data={})=>trace.push({at:performance.now(),kind,...data});
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 const {LocalVideoPreviewProvider}=await import('/web/generated/preview/providers.js');
 const bytes=await(await fetch('/fixtures/example.mp4')).blob();
 record('fixture',{sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await bytes.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('')});
 const source=new File([bytes],'example.mp4',{type:'video/mp4'});
 const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),urls=new Set();
 URL.createObjectURL=value=>{const url=create(value);urls.add(url);record('url-acquired');return url;};
 URL.revokeObjectURL=url=>{revoke(url);urls.delete(url);record('url-released');};
 try{
  if(scenario.startsWith('preview-')){
   const controller=new AbortController();let receipt,video;
   const host={createElement(name){const element=document.createElement(name);if(name==='video'){
    video=element;
    if(negativeControl){const remove=element.removeAttribute.bind(element);element.removeAttribute=name=>{if(name!=='src')remove(name);};}
    for(const event of ['loadedmetadata','loadeddata','seeking','seeked','error','abort','emptied'])element.addEventListener(event,()=>record(event));
    if(scenario==='preview-abort-load')element.addEventListener('loadstart',()=>{record('cancel');controller.abort();},{once:true});
    if(scenario==='preview-abort-seek')element.addEventListener('seeking',()=>{record('cancel');controller.abort();},{once:true});
   }return element;}};
   const provider=new LocalVideoPreviewProvider(()=>scenario==='preview-invalid-media'?new Blob(['invalid media']):source,host);
   let frame,error;
   try{frame=await provider.getFrame({time:2,width:160,signal:controller.signal,trackCleanup:p=>{receipt=p;}});record('fulfilled');}
   catch(e){error=e;record('rejected',{name:e.name,message:e.message});}
   await receipt;
   if(scenario==='preview-success'){
    assert(!error&&frame?.image.blob.size>0,'Preview did not produce an encoded image');
    const bitmap=await createImageBitmap(frame.image.blob);assert(bitmap.width===160&&bitmap.height>0,'Invalid decoded preview dimensions');bitmap.close();
   }else if(scenario==='preview-invalid-media')assert(error,'Invalid media was accepted');
   else{assert(trace.some(e=>e.kind==='cancel'),'Cancellation trigger was never reached');assert(error?.name==='AbortError','Cancelled preview did not reject with AbortError');}
   assert(!video.hasAttribute('src'),'Retired preview retained media source');assert(urls.size===0,'Preview leaked object URL');
   await new Promise(resolve=>setTimeout(resolve,100));assert(urls.size===0,'Late event reacquired URL');
   return {trace,remainingURLs:urls.size,bytes:frame?.image.blob.size??0};
  }
  const {Player}=await import('/web/generated/index.js');
  const host=document.createElement('div');document.body.append(host);
  const mode=scenario.startsWith('hybrid-')?'hybrid':scenario.startsWith('software-')?'software':'native';
  const player=new Player(host,{mode,preview:false});let count=0;
  const unsubscribe=player.subscribe(s=>{count++;record('state',{status:s.status,source:s.sourceId,intent:s.playbackIntent});});
  try{
   let operations;
   if(scenario.endsWith('destroy-during-open'))operations=[player.open(source)];
   else{await player.open(source);operations=[player.play(),player.seek(2,{policy:'latest'}),player.pause(),player.seek(3,{policy:'latest'})];}
   // Attach rejection observers before destruction can reject outstanding work.
   const settled=Promise.allSettled(operations);unsubscribe();const before=count;
   record('destroy-request');await player.destroy();const outcomes=await settled;
   record('destroyed',{outcomes:outcomes.map(x=>({status:x.status,code:x.reason?.code,name:x.reason?.name}))});
   await player.destroy();await new Promise(resolve=>setTimeout(resolve,100));
   assert(player.isDestroyed,'Player did not retire');assert(count===before,'Retired subscriber called');
   assert(host.childElementCount===0,'Destroyed player retained owned DOM');assert(urls.size===0,'Destroyed player retained URLs');
   for(const outcome of outcomes)assert(outcome.status==='fulfilled'||outcome.reason?.code==='ABORTED'||outcome.reason?.name==='AbortError','Unexpected pending-operation rejection');
   return {trace,remainingURLs:urls.size};
  }finally{unsubscribe();await player.destroy();host.remove();}
 }finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
}
