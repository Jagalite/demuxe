// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function lifecycle(config){
 const result={config,kind:'lifecycle',frames:[],checks:{},errors:[]},owners=document.querySelectorAll('iframe').length;let player;const live=new Set();let created=0,retired=0,peak=0;
 const instrument=()=>{const backend=player.current.backend,create=backend.createPreviewSession.bind(backend);backend.createPreviewSession=options=>{const child=create(options);if(!child)return child;const id=++created;live.add(id);peak=Math.max(peak,live.size);return {...child,destroy:async()=>{await child.destroy();if(live.delete(id))retired++;}};};};
 const load=async revision=>{const shaka=config.path.startsWith('shaka'),file=config.path==='software'?'software.mkv':config.path==='remux'?'movie.mkv':shaka?'dash-av/main.mpd':'movie.mp4';const url=new URL('/media/'+file,location.href);url.searchParams.set('case',config.id);url.searchParams.set('revision',revision);await player.openRemote({url:url.href,...shaka?{format:'dash'}:['remux','hybrid','software'].includes(config.path)?{immutable:true}:{}});};
 try{
  player=new Player(document.querySelector('#surface'),{mode:['hybrid','software'].includes(config.path)?config.path:'native',automaticSelection:false,nativeRemux:config.path==='remux'?'always':'never',remuxRuntime:config.runtime??'off',preview:{debounceMs:0,bucketSeconds:0,timeoutMs:15000},startupEscalation:false,experimentalMpvSubtitles:false});
  await load('one');instrument();const original=player.current.backend;let seeks=0;player.addEventListener('seeking',()=>seeks++);player.addEventListener('error',e=>result.errors.push(String(e.detail?.message??e.detail)));
  const frame=await player.preview.getFrame({time:10,width:160,height:90});if(!frame)throw Error('Initial preview unavailable');
  await sleep(5300);result.checks.idleReleasesDecoder=live.size===0;result.checks.idlePreservesCache=(await player.preview.getFrame({time:10,width:160,height:90}))?.cache==='hit';
  const pending=[];for(let i=0;i<12;i++){pending.push(player.preview.getFrame({time:2+i,width:160,height:90}).catch(e=>e.name));await sleep(2);}
  const settled=await Promise.all(pending);result.checks.latestWins=Math.abs((settled.at(-1)?.time??-1)-13)<.25;result.checks.supersededSettle=settled.slice(0,-1).every(f=>f==='AbortError'||f?.image);result.checks.primaryUnchanged=player.current.backend===original&&seeks===0;
  player.preview.clear();const disabling=player.preview.getFrame({time:18,width:160,height:90}).catch(e=>e.name);await sleep(5);player.preview.enabled=false;const disabled=await disabling;result.checks.disableSettles=disabled==='AbortError'||disabled?.image!==undefined;result.checks.disabledReturnsNull=(await player.preview.getFrame({time:10}))===null;
  player.preview.enabled=true;result.checks.reenable=!!await player.preview.getFrame({time:10,width:160,height:90});
  player.preview.clear();const replacing=player.preview.getFrame({time:18,width:160,height:90}).catch(e=>e.name);await sleep(5);result.checks.noSeekBeforeSource=seeks===0;await load('two');instrument();seeks=0;const replaced=await replacing;result.checks.sourceRetiresWork=replaced==='AbortError'||replaced?.image!==undefined;result.checks.sourceClearsCache=player.preview.diagnostics.cacheEntries===0;const fresh=await player.preview.getFrame({time:12,width:160,height:90});result.checks.newSourceWorks=!!fresh&&fresh.cache==='miss';
  player.preview.clear();const destroying=player.preview.getFrame({time:18,width:160,height:90}).catch(e=>e.name);await sleep(5);await player.destroy();const cancelled=await destroying;result.checks.destroySettles=cancelled==='AbortError'||cancelled?.image!==undefined;result.checks.terminal=(await player.preview.getFrame({time:1}).catch(e=>e.name))==='AbortError';result.checks.noPrimaryErrors=!result.errors.length;result.checks.noPrimarySeeks=seeks===0;result.checks.onePreviewDecoder=peak===1;result.checks.allDecodersRetired=live.size===0&&created===retired;result.resources={created,retired,peak};
 }catch(e){result.failure=String(e.stack??e);result.error={name:e.name,code:e.code,message:e.message};}
 finally{await player?.destroy();await sleep(100);result.checks.noIframeLeaks=document.querySelectorAll('iframe').length===owners;}
 result.status=!result.failure&&Object.values(result.checks).every(Boolean)?'pass':'fail';return result;
}
export async function capability(){
 const result={config:{id:'unsupported-jspi'},kind:'capability',frames:[],checks:{},errors:[]},owners=document.querySelectorAll('iframe').length;
 result.supported=typeof WebAssembly.Suspending==='function';if(result.supported)return {...result,status:'not-applicable'};
 for(const mode of ['native','hybrid','software']){
  try{const p=new Player(document.querySelector('#surface'),{mode,remuxRuntime:'jspi'});await p.destroy();result.checks[mode]=false;}catch(e){result.errors.push({name:e.name,code:e.code,message:e.message});result.checks[mode]=e.code==='UNSUPPORTED_FEATURE'&&/JSPI/.test(e.message);}
 }
 result.checks.noIframeLeaks=document.querySelectorAll('iframe').length===owners;result.status=Object.values(result.checks).every(Boolean)?'pass':'fail';return result;
}
