// SPDX-License-Identifier: Apache-2.0
// Run against installed candidate packages prepared by shaka-provider-smoke.mjs.
const cases=[];
window.smokeResult={passed:false,cases,browser:navigator.userAgent,scope:'Installed Shaka provider: bounded synthetic HLS/DASH playback, omission, corruption and missing declared asset. No release or general format qualification.'};
const root=new URL('./',location.href),requests=[],request=globalThis.fetch;
globalThis.fetch=(url,...args)=>{requests.push(String(url));return request(url,...args);};
const assert=(condition,message)=>{if(!condition)throw Error(message);};
async function playback(folder,name,format,expected){
 const result={folder,name,format,passed:false};cases.push(result);const before=requests.length;
 const {Player}=await import(new URL(folder+'/web/generated/index.js',root).href);
 const host=document.createElement('div');document.body.append(host);
 const player=new Player(host,{assetBase:new URL(folder+'/',root).href});
 try{
  const url=new URL('media/'+name,root).href;
  let failure;
  try{await player.openRemote({url,format,...(format==='file'?{}:{streaming:{maxBandwidth:4000000}})});}catch(error){failure=error;}
  if(expected){assert(failure?.code===expected,`Expected ${expected}; got ${failure?.code}: ${failure?.message}`);result.code=failure.code;}
  else{
   if(failure)throw failure;
   await player.play();const deadline=performance.now()+10000;
   while(Number(player.properties.get('time-pos'))<.3&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
   assert(Number(player.properties.get('time-pos'))>=.3,'Playback did not advance');
   result.diagnostics=player.diagnostics;
   assert(result.diagnostics.plan.id===(format==='file'?'native-direct':'shaka-mse'),'Unexpected playback plan');
   await player.pause();await player.seek(2);await player.play();
   assert(Number(player.properties.get('time-pos'))>=1.9,'Seek did not apply');
  }
  result.passed=true;
 }catch(error){result.error=String(error.stack);}
 finally{await player.destroy();host.remove();result.requests=requests.slice(before);}
 if(folder==='omitted')assert(!result.requests.some(url=>url.includes('shaka-player')),'Omitted provider fetched Shaka');
}
try{
 await playback('included','hls/index.m3u8','hls');
 await playback('included','dash/index.mpd','dash');
 await playback('omitted','direct.mp4','file');
 await playback('omitted','dash/index.mpd','dash','DEPLOYMENT_UNAVAILABLE');
 await playback('corrupt','dash/index.mpd','dash','ASSET_LOAD_FAILED');
 await playback('missing','dash/index.mpd','dash','ASSET_LOAD_FAILED');
 window.smokeResult.passed=cases.length===6&&cases.every(item=>item.passed);
}catch(error){window.smokeResult.error=String(error.stack);}
window.smokeResult.finished=true;
document.querySelector('#result').textContent=JSON.stringify(window.smokeResult,null,2);
