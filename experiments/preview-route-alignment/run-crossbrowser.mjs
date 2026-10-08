// SPDX-License-Identifier: Apache-2.0
const {chromium,firefox,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import {writeFile} from 'node:fs/promises';
import {serve} from './server.mjs';
const name=process.env.BROWSER??'firefox',engine={chromium,firefox,webkit}[name];if(!engine)throw Error('BROWSER must be chromium, firefox or webkit');
const server=await serve();let browser;
console.log(JSON.stringify({browser:name,origin:server.origin,output:server.output}));
try{
 browser=await engine.launch({headless:true,...name==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.blocking_policy':0}}:{}});
 const setup=await browser.newPage({viewport:{width:1280,height:800}});await setup.goto(server.origin);
 const host=await setup.evaluate(()=>({userAgent:navigator.userAgent,isolated:crossOriginIsolated,hardwareConcurrency:navigator.hardwareConcurrency,videoDecoder:typeof VideoDecoder,offscreenCanvas:typeof OffscreenCanvas,sharedArrayBuffer:typeof SharedArrayBuffer,jspi:typeof WebAssembly.Suspending,mp4:document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"')}));host.browserVersion=await browser.version();host.browser=name;
 await writeFile(server.output+'/host.json',JSON.stringify(host,null,2)+'\n');console.log(JSON.stringify(host));
 let configs=await setup.evaluate(async()=>{const {matrix}=await import('/experiment/matrix.js');return [...matrix.map(x=>({...x,id:'production-'+x.id})),...['direct','remux','hybrid','software'].map(path=>({id:'anamorphic-'+path,path,remote:true,file:'anamorphic.mp4',expectedWidth:120,expectedHeight:90})),...['jspi','asyncify'].flatMap(runtime=>['hybrid','software'].map(path=>({id:`anamorphic-${path}-${runtime}`,path,runtime,remote:true,file:'anamorphic.mp4',expectedWidth:120,expectedHeight:90})))];});
 if(process.env.STRESS==='1')configs.push(...['1080p','4k'].flatMap(size=>['direct','remux','hybrid','software'].map(path=>({id:`stress-${size}-${path}`,path,remote:true,file:size+'.mp4',duringPlayback:'allow'}))),...['direct','remux','hybrid','software'].map(path=>({id:'throttled-'+path,path,remote:true,throttle:true})));
 if(process.env.CASES)configs=configs.filter(c=>new RegExp(process.env.CASES).test(c.id));
 if(process.env.REPEAT)configs=configs.flatMap(c=>new RegExp(process.env.REPEAT_MATCH??'.').test(c.id)?Array.from({length:Number(process.env.REPEAT)},(_,index)=>({...c,id:c.id+'-repeat-'+index})):[c]);await setup.close();
 const results=[];
 for(const config of configs){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('crash',()=>errors.push('Page process crashed'));
  const stages=[];page.on('console',message=>{if(message.text().startsWith('preview-stage '))stages.push(message.text().slice(14));});await page.exposeBinding('previewGesture',async({page},id)=>{await page.locator('[data-preview-gesture=\"'+id+'\"]').click();});await page.goto(server.origin);
  if(process.env.TRACE_SESSIONS==='1')await page.evaluate(async()=>{window.previewSessionTrace=(await import('/experiment/trace-session.js')).tracePreviewSessions();});
  let timer,result;
  try{result=await Promise.race([page.evaluate(async config=>(await import('/experiment/production.js')).runCase(config),config),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Case exceeded 90 seconds')),90000))]);}
  catch(e){result={config,status:'fail',failure:String(e),frames:[],checks:{completed:false}};}finally{clearTimeout(timer);}
  if(process.env.TRACE_SESSIONS==='1')result.sessionTrace=await page.evaluate(()=>window.previewSessionTrace).catch(()=>[]);
  result.pageErrors=errors;result.stages=stages;result.checks.noUnhandledErrors=errors.length===0;if(errors.length)result.status='fail';await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});results.push({id:config.id,runtime:config.runtime,status:result.status,error:result.error,failure:result.failure,checks:result.checks});await page.close();
 }
 let control;
 if(process.env.STRESS==='1'){
  const page=await browser.newPage();await page.goto(server.origin);control=await page.evaluate(async()=>(await import('/experiment/control-paths.js')).control({id:'control-4k-remux',path:'remux',file:'4k.mp4'}));await page.close();
 }
 const extras=[];let maintained;
 if(['1','maintained'].includes(process.env.EXTRA)){
  const page=await browser.newPage({viewport:{width:1280,height:800}});await page.exposeBinding('previewGesture',async({page},id)=>{await page.locator('[data-preview-gesture=\"'+id+'\"]').click();});await page.goto(server.origin);
  if(process.env.EXTRA==='1'){
  const negative=await page.evaluate(async()=>(await import('/experiment/lifecycle.js')).capability());await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(negative)});extras.push(negative);
  for(const config of [...['direct','remux','shaka-generated','hybrid','software'].map(path=>({id:'lifecycle-'+path,path})),...['remux','hybrid','software'].map(path=>({id:'lifecycle-'+path+'-asyncify',path,runtime:'asyncify'})),...host.jspi==='function'?['remux','hybrid','software'].map(path=>({id:'lifecycle-'+path+'-jspi',path,runtime:'jspi'})):[]]){
   const result=await page.evaluate(async config=>(await import('/experiment/lifecycle.js')).lifecycle(config),config);await fetch(server.origin+'/receipt',{method:'POST',body:JSON.stringify(result)});extras.push(result);
  }
  const guards=await page.evaluate(async()=>(await import('/experiment/guards.js')).runGuards([{id:'guard-defer',path:'remux',policy:'defer'},{id:'guard-policy-snapshot',path:'remux',policy:'defer',mutatePolicy:true},{id:'guard-software-1080p',path:'software',file:'1080p.mp4'},{id:'guard-software-4k',path:'software',file:'4k.mp4'},{id:'guard-expired-auth',path:'remux',expire:true}]));extras.push(...guards);
  }
  maintained=await page.evaluate(async()=>{const m=await import('/web/generated/maintained-preview.js'),results={sourceHashes:m.sourceHashes};for(const [name,run]of [['native',m.nativeCase],['software',m.softwareCase]])try{results[name]={status:'pass',result:await run()};}catch(e){results[name]={status:'fail',error:String(e.stack??e)};}return results;});
  await writeFile(server.output+'/maintained-browser.json',JSON.stringify(maintained,null,2)+'\n');
  await page.close();
 }
 await writeFile(server.output+'/run.json',JSON.stringify({host,results,extras,control},null,2)+'\n');await writeFile(server.output+'/served-assets.json',JSON.stringify([...server.receipts.values()],null,2)+'\n');
 const unsupported=results.filter(r=>r.runtime==='jspi'&&host.jspi!=='function'&&r.error?.code==='UNSUPPORTED_FEATURE');
 const failures=[...results,...extras].filter(r=>!['pass','not-applicable'].includes(r.status)&&!unsupported.includes(r));
 if(maintained)for(const name of ['native','software'])if(maintained[name].status!=='pass')failures.push({id:'maintained-'+name,...maintained[name]});
 console.log(JSON.stringify({output:server.output,total:results.length,extraCases:extras.length,unsupported:unsupported.length,failures}));
 if(failures.length)process.exitCode=1;
}finally{await browser?.close();await server.close();}
