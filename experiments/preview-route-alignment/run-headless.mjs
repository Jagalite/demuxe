// SPDX-License-Identifier: Apache-2.0
// Fallback for an explicitly unavailable collaborative browser host.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const server=await serve();let browser;
console.log(JSON.stringify({origin:server.origin,output:server.output}));
try{
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto(server.origin);
 const host=await page.evaluate(()=>({userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory,isolated:crossOriginIsolated,visibility:document.visibilityState}));
 host.browserVersion=await browser.version();host.automation='Headless installed Chrome; T3 preview_open explicitly reported no host';
 await writeFile(server.output+'/host.json',JSON.stringify(host,null,2)+'\n');
 const configs=await page.evaluate(async()=>{const {matrix}=await import('/experiment/matrix.js');return [
  ...['direct','remux','hybrid','software'].map(path=>({id:'anamorphic-'+path,path,remote:true,file:'anamorphic.mp4',expectedWidth:120,expectedHeight:90})),
  ...matrix.map(x=>({...x,id:'production-'+x.id,productionBaseline:false})),
  ...['1080p','4k'].flatMap(size=>['direct','remux','hybrid','software'].map(path=>({id:`stress-${size}-${path}`,path,remote:true,file:size+'.mp4',duringPlayback:'allow'}))),
  ...['direct','remux','hybrid','software'].map(path=>({id:'throttled-'+path,path,remote:true,throttle:true}))
 ];});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const batch=[];
 for(const config of configs){
  const before=await metric();const result=await page.evaluate(async config=>(await import('/experiment/production.js')).runCase(config),config);const after=await metric();
  result.mainThread={taskSeconds:after.TaskDuration-before.TaskDuration,scriptSeconds:after.ScriptDuration-before.ScriptDuration,heapBefore:before.JSHeapUsedSize,heapAfter:after.JSHeapUsedSize,scope:'Whole case including startup/teardown; renderer main thread only, excludes decoder workers and GPU'};
  await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});batch.push({id:config.id,status:result.status,failure:result.failure,checks:result.checks});
 }
 const guards=await page.evaluate(async()=>(await import('/experiment/guards.js')).runGuards([
  {id:'guard-defer',path:'remux',policy:'defer'},
  {id:'guard-policy-snapshot',path:'remux',policy:'defer',mutatePolicy:true},
  {id:'guard-software-1080p',path:'software',file:'1080p.mp4'},
  {id:'guard-software-4k',path:'software',file:'4k.mp4'},
  {id:'guard-expired-auth',path:'remux',expire:true},
  {id:'guard-remux-4k-paused',path:'remux',file:'4k.mp4',policy:'defer'}
 ]));
 const control=await page.evaluate(async()=>(await import('/experiment/control-paths.js')).control({id:'control-4k-remux',path:'remux',file:'4k.mp4'}));
 const maintained=await page.evaluate(async()=>{const m=await import('/web/generated/maintained-preview.js'),results={sourceHashes:m.sourceHashes};for(const [name,run]of [['native',m.nativeCase],['software',m.softwareCase]])try{results[name]={status:'pass',result:await run()};}catch(e){results[name]={status:'fail',error:String(e.stack??e)};}return results;});
 await writeFile(server.output+'/maintained-browser.json',JSON.stringify(maintained,null,2)+'\n');
 await writeFile(server.output+'/run.json',JSON.stringify({batch,guards,control:{status:control.status,pace:control.pace,failure:control.failure},maintained,host},null,2)+'\n');
 await writeFile(server.output+'/served-assets.json',JSON.stringify([...server.receipts.values()],null,2)+'\n');
 console.log(JSON.stringify({output:server.output,total:batch.length+guards.length,failures:[...batch,...guards].filter(x=>x.status!=='pass'),control:control.status,maintained}));
}finally{await browser?.close();await server.close();}
