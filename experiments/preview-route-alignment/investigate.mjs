// SPDX-License-Identifier: Apache-2.0
import {serve} from './server.mjs';
import {writeFile} from 'node:fs/promises';
const browsers=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),name=process.env.BROWSER??'webkit',kind=process.env.PROBE??'decoder';
const server=await serve();let browser;const results=[];console.log(JSON.stringify({output:server.output,kind}));
try{
 browser=await browsers[name].launch({headless:true,...name==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0}}:{}});
 let configs=kind==='decoder'?Array.from({length:Number(process.env.REPEATS??3)},(_,repeat)=>[true,false].map(duration=>({id:`decoder-${repeat}-${duration}`,duration}))).flat():[{id:'budget-12',budget:12},{id:'budget-64-current',budget:64},{id:'budget-64-experimental',budget:64,override:true},{id:'budget-64-experimental-preview',budget:64,override:true,preview:true}];
 if(kind==='adaptive')configs=(process.env.RUNTIMES??'off').split(',').map(runtime=>({id:'adaptive-4k-'+runtime,runtime,preview:true,previewStartSeconds:Number(process.env.PREVIEW_START_SECONDS??0),...process.env.BUDGET?{budget:Number(process.env.BUDGET)}:{}}));
 if(process.env.CASES)configs=configs.filter(c=>new RegExp(process.env.CASES).test(c.id));
 for(const config of configs){
  if(process.env.TRACE==='1')config.trace=true;
  if(process.env.WORKER)config.worker=process.env.WORKER;
  if(process.env.CHILD_BUDGET)config.childBudget=Number(process.env.CHILD_BUDGET);
  const page=await browser.newPage();let result,timer;const errors=[];page.on('crash',()=>errors.push('PAGE_CRASH'));page.on('pageerror',e=>errors.push(String(e)));
  if(config.override)await page.route('**/generated/internal/machine/buffering-policy.js',async route=>{
   const response=await route.fetch(),body=await response.text();
   const changed=body.replace(/Math\.min\(policy\.memoryBudget \?\? 12 \* MiB, 12 \* MiB\)/,'(policy.memoryBudget ?? 12 * MiB)');
   if(body===changed)throw Error('Experimental budget patch did not match');
   await writeFile(server.output+'/experimental-buffering-policy.js',changed);await route.fulfill({response,body:changed});
  });
  if(config.childBudget)await page.route('**/generated/internal/preview-session.js',async route=>{
   const response=await route.fetch(),body=await response.text();
   const changed=body.replace('memoryBudget: 8 * 1024 * 1024','memoryBudget: '+config.childBudget+' * 1024 * 1024');
   if(body===changed)throw Error('Experimental child budget patch did not match');
   await writeFile(server.output+'/experimental-preview-session.js',changed);await route.fulfill({response,body:changed});
  });
  try{
   await page.exposeBinding('previewGesture',async({page},id)=>page.locator('[data-preview-gesture="'+id+'"]').click());await page.goto(server.origin);
   result=await Promise.race([page.evaluate(async({kind,config})=>kind==='decoder'?await new Promise((resolve,reject)=>{const w=new Worker('/experiment/'+(config.worker??'investigate-worker.js'),{type:'module'});w.onmessage=e=>{w.terminate();resolve(e.data);};w.onerror=e=>{w.terminate();reject(Error(e.message));};w.postMessage(config);}):(await import('/experiment/investigate-remux.js')).probe(config),{kind,config}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Probe deadline')),60000);timer.unref();})]);
  }catch(e){result={status:'fail',failure:String(e)};}finally{clearTimeout(timer);await page.close().catch(()=>{});}
  for(const key of ['preview','pausedPreview'])if(result[key]?.dataURL){const file=config.id+'-'+key+'.png';await writeFile(server.output+'/'+file,Buffer.from(result[key].dataURL.split(',')[1],'base64'));delete result[key].dataURL;result[key].image=file;}
  results.push({...result,config,pageErrors:errors});await writeFile(server.output+'/'+config.id+'.json',JSON.stringify(results.at(-1),null,2));console.log(JSON.stringify({id:config.id,status:result.status,outputs:result.outputs,finalTime:result.finalTime,errors:result.errors,pageErrors:errors,failure:result.failure}));
 }
 await writeFile(server.output+'/run.json',JSON.stringify({browser:name,version:browser.version(),kind,results},null,2));await writeFile(server.output+'/served-assets.json',JSON.stringify([...server.receipts.values()],null,2));
}finally{await browser?.close();await server.close();}
