// SPDX-License-Identifier: Apache-2.0
// File-I/O diagnostic, not a CPU/physical-output benchmark. No playback engines.
import {chromium, firefox} from 'playwright';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, basename, dirname} from 'node:path';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const files=process.env.PROBE_FILES?JSON.parse(process.env.PROBE_FILES):['fixtures/example.mp4','fixtures/m0.mkv'];
const out=process.env.OUT??`results/fast-probe/${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dirname(out),{recursive:true});await mkdir(out);
const candidate=await readFile('web/fast-source-inspector.js','utf8');
const variants={candidate,...(process.env.PROBE_BASELINE?{baseline:await readFile(process.env.PROBE_BASELINE,'utf8')}:{})};
const playbackFiles=process.env.PROBE_PLAYBACK_FILES?JSON.parse(process.env.PROBE_PLAYBACK_FILES):[];
const result={startup:[],scope:'Sequential browser File probe, pre-imported JS, fresh contexts, first/repeat reads; OS cache uncontrolled; no CPU, engine preparation or playback timing',files:[],variants:{},runs:[]};
for(const file of files){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);result.files.push({path:resolve(file),bytes:(await stat(file)).size,sha256:hash.digest('hex')});}
for(const [name,code]of Object.entries(variants)){result.variants[name]=createHash('sha256').update(code).digest('hex');await writeFile(`${out}/${name}.js`,code);}
const server=await serve();
try{for(const name of ['chrome','firefox'])for(let round=0;round<2;round++){
 const browser=await(name==='chrome'?chromium:firefox).launch({headless:true,...(name==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{firefoxUserPrefs:{'media.autoplay.default':0}})});
 try{for(const variant of (round?Object.keys(variants).reverse():Object.keys(variants))){
  const page=await browser.newPage();await page.route('**/probe-under-test.js',r=>r.fulfill({contentType:'text/javascript',body:variants[variant]}));
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async()=>{window.probe=(await import('/web/probe-under-test.js')).inspectFastSource;const input=document.createElement('input');input.type='file';input.id='probe-file';document.body.append(input);});
  for(const file of files){await page.locator('#probe-file').setInputFiles(file);
   for(let repeat=0;repeat<2;repeat++){
    const data=await page.evaluate(()=>probe(document.querySelector('#probe-file').files[0],{requirements:['container','tracks']}));
    if(variant==='candidate'){assert.ok(data.reads<=8);assert.ok(data.bytesRead<=512*1024);}
    result.runs.push({browser:name,version:browser.version(),round,variant,file:resolve(file),repeat,...data});
    console.log(name,round,variant,basename(file),repeat,data.status,data.reads,data.batches??'-',Math.round(data.wallMs)+'ms',data.reason??'');
    await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
   }
  }
  await page.close();
  if(round===0)for(const file of playbackFiles){
   const playback=await browser.newPage(),errors=[];playback.on('pageerror',e=>errors.push(String(e)));
   await playback.route('**/fast-source-inspector.js',r=>r.fulfill({contentType:'text/javascript',body:variants[variant]}));
   await playback.goto(server.origin+'/web/player.html');await playback.waitForFunction(()=>!!window.player);
   const preparation=await playback.evaluate(()=>player.preparationReady);assert.ok(preparation.assets.every(a=>a.status==='ready'));
   await playback.evaluate(()=>{
    window.stages=[];window.openStarted=0;
    document.querySelector('#viewer').shadowRoot.querySelector('#file').addEventListener('change',()=>{window.openStarted=performance.now();},true);
    for(const key of ['open','inspectWithFFmpeg']){const original=player[key];player[key]=async function(...args){
     const at=performance.now();try{return await original.apply(this,args);}finally{stages.push({name:key,at:at-openStarted,ms:performance.now()-at});}
    };}
   });
   await playback.locator('#viewer #file').setInputFiles(file);
   await playback.waitForFunction(()=>!!player.state.sourceId&&!player.state.pendingOperation,null,{timeout:60000});
   await playback.evaluate(()=>player.play());await playback.waitForFunction(()=>player.state.currentTime>.25,null,{timeout:20000});
   const data=await playback.evaluate(()=>({stages,status:player.state.status,time:player.state.currentTime,diagnostics:player.diagnostics}));
   assert.equal(data.status,'playing');assert.deepEqual(errors,[]);
   result.startup.push({browser:name,version:browser.version(),variant,file:resolve(file),...data});
   console.log('PLAYBACK',name,variant,basename(file),data.diagnostics.plan?.id,Math.round(data.stages.find(s=>s.name==='open').ms)+'ms');
   await playback.evaluate(()=>player.destroy());await playback.close();
   await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
  }
 }}finally{await browser.close();}
}}catch(error){result.error=String(error.stack);process.exitCode=1;}finally{await server.close();await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(out);}
