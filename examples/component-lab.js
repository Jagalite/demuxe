// SPDX-License-Identifier: Apache-2.0
const $=id=>document.getElementById(id),video=document.querySelector('video');
const qualification=await(await fetch('/qualification.json')).json();let active;
async function stop(){const old=active;active=undefined;if(!old)return;old.controller.abort();video.pause();video.removeAttribute('src');video.load();if(old.url)URL.revokeObjectURL(old.url);await old.acquisition?.dispose();}
function event(target,name,signal){return new Promise((resolve,reject)=>{signal.throwIfAborted();const timer=setTimeout(()=>finish(Error(name+' timeout')),15000);const abort=()=>finish(signal.reason),ok=()=>finish(),bad=()=>finish(Error('Media operation failed'));function finish(error){clearTimeout(timer);signal.removeEventListener('abort',abort);target.removeEventListener(name,ok);target.removeEventListener('error',bad);error?reject(error):resolve();}signal.addEventListener('abort',abort,{once:true});target.addEventListener(name,ok,{once:true});target.addEventListener('error',bad,{once:true});});}
$('stop').onclick=()=>stop().then(()=>{$('status').textContent='Stopped';});
$('run').onclick=async()=>{
 $('run').disabled=true;await stop();const run=active={controller:new AbortController()},signal=run.controller.signal;
 try{
  const family=/Firefox\/(\d+)/.exec(navigator.userAgent),chrome=/Chrome\/(\d+)/.exec(navigator.userAgent);
  if(!qualification.browsers.some(b=>b.family===(family?'firefox':'chrome')&&b.major===(family??chrome)?.[1]))throw Error('This browser version has no recorded component qualification. Use the regular Player playground.');
  const codec=$('codec').value,base=new URL('/'+$('deployment').value+'/',location.href);
  const [{parseProviderDeployment},{ProviderAcquisition},{audioRepairRecipe,packetCopyRecipe},{executeComponentBinding},{createComponentOwners}]=await Promise.all([
   import(new URL('web/generated/internal/provider-catalog.js',base)),import(new URL('web/generated/internal/provider-acquisition.js',base)),import(new URL('web/generated/internal/component-recipes.js',base)),import(new URL('web/generated/internal/component-selection.js',base)),import(new URL('web/providers/components/provider-container/src/owners.js',base)),
  ]);
  signal.throwIfAborted();const catalog=parseProviderDeployment(await(await fetch(new URL('demuxe-providers.json',base),{signal})).json(),base),owners=createComponentOwners(catalog,base);
  run.acquisition=new ProviderAcquisition(catalog,owners.owners);
  const input=await(await fetch('/fixtures/'+codec+'.mkv',{signal})).arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==qualification.fixtures[codec])throw Error('Fixture changed after qualification');
  const logical=codec==='dca'?'dts-core':codec,recipe=codec==='copy'?packetCopyRecipe():audioRepairRecipe(logical),scopeKey=JSON.stringify([recipe.id,hash,navigator.userAgent]);
  const evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey,implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,qualification.identities[a.providerId]]))}));
  $('status').textContent='Preparing '+recipe.id;const started=performance.now();
  const result=await executeComponentBinding(run.acquisition,recipe,evidence,scopeKey,codec==='copy'?'typescript':'fine',binding=>codec==='copy'?owners.executeCopy(new Blob([input]),signal):owners.execute(new Blob([input]),logical,binding,signal));
  signal.throwIfAborted();const media=new MediaSource();run.url=URL.createObjectURL(media);const opened=event(media,'sourceopen',signal);video.src=run.url;await opened;
  const buffer=media.addSourceBuffer(codec==='copy'?'video/mp4; codecs="avc1.64001e,mp4a.40.2"':'video/mp4; codecs="avc1.64001e,flac"'),bytes=await result.value.arrayBuffer(),appended=event(buffer,'updateend',signal);buffer.appendBuffer(bytes);await appended;media.endOfStream();await video.play();
  $('status').textContent=JSON.stringify({recipe:recipe.id,decision:result.decision,preparationMs:Math.round(performance.now()-started),outputBytes:bytes.byteLength,providers:owners.readiness(),note:'One timing observation is not cost-ranking evidence. FLAC24 repair quantizes floating-point audio.'},null,2);
 }catch(error){if(active===run){$('status').textContent=(error.code??error.name)+': '+error.message;await stop();}}finally{$('run').disabled=false;}
};
window.addEventListener('pagehide',()=>{void stop();});
