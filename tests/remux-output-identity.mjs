// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=`results/remux-output-identity/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const result={browser:browser.version(),cases:[]};
const fixtures={reference:'results/production-pipeline-fixtures/canonical_rate.mp4',D09:'results/production-pipeline-fixtures/absolute.mp4',D10:'results/production-pipeline-fixtures/missing_tfdt.mp4',long:'build/remux-jspi-fixtures-v1/avc-aac-24s.ts'};
const server=await serve({isolated:true,mediaPaths:fixtures});
const outputs={};
const digest=b=>createHash('sha256').update(b).digest('hex');
const packets=path=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_data_hash','sha256','-of','json',path],{encoding:'utf8',maxBuffer:8*1024*1024})).packets.map(p=>Object.fromEntries(['stream_index','pts','dts','duration','data_hash'].map(k=>[k,p[k]])));
const decode=(path,type)=>execFileSync('ffmpeg',['-v','error','-i',path,'-map',`0:${type}:0`,...(type==='v'?['-c:v','rawvideo','-pix_fmt','yuv420p','-fps_mode','passthrough']:['-c:a','pcm_f32le']),'-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();
try{for(const [name,mode] of [['reference','gather'],['D09','separate'],['D10','separate'],['long','separate'],['long','progressive']]){
 const page=await browser.newPage();await page.route('**/native-remux-player.js',async route=>{const body=await readFile('web/native-remux-player.js','utf8');await route.fulfill({contentType:'text/javascript',body:body.replace("fragmentDelivery='separate'",`fragmentDelivery='${mode}'`)});});await page.goto(server.origin+'/experiment/page.html');
 const data=await page.evaluate(async url=>{
  Object.defineProperty(MediaSource,'canConstructInDedicatedWorker',{value:false});window.output=[];
  const Base=Worker;window.Worker=class extends Base{constructor(...args){super(...args);if(String(args[0]).includes('native-remux-worker'))this.addEventListener('message',({data})=>{for(const b of data.parts??data.buffers??(data.buffer?[data.buffer]:[]))if(b.byteLength)output.push([...new Uint8Array(b)]);});}};
  const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});await player.openRemote({url});await player.rate(2);await player.play();
  await new Promise((resolve,reject)=>{const deadline=performance.now()+20000;const check=()=>{if(player.surface.ended)resolve();else if(performance.now()>deadline)reject(Error('EOF timeout'));else setTimeout(check,25);};check();});
  return {output,diagnostics:player.diagnostics};
 },server.origin+'/media/'+name);
 const bytes=Buffer.concat(data.output.map(v=>Buffer.from(v))),path=out+`/${name}-${mode}.mp4`;await writeFile(path,bytes);outputs[name+'-'+mode]=path;
 const packetReference=name==='long'?outputs['long-separate']:outputs['reference-gather'];assert.deepEqual(packets(path),packets(packetReference));
 const video=decode(path,'v'),audio=decode(path,'a');const reference=name==='long'?fixtures.long:outputs['reference-gather'];assert.equal(video,decode(reference,'v'));assert.equal(audio,decode(reference,'a'));
 // Audit the actual maintained constructor against R162's exact one-traf,
 // one-sample 104-byte moof contract. No post-construction patch pass is added.
 let moofs=0,qualified=0;for(let p=0;p<bytes.length;){const n=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8);assert.ok(n>=8&&p+n<=bytes.length);if(type==='moof'){moofs++;if(n===104)qualified++;}p+=n;}
 result.cases.push({name,mode,passed:true,sourceSHA256:digest(await readFile(fixtures[name])),outputSHA256:digest(bytes),packetPayloadTimingReference:packetReference,packetPayloadTimingExact:true,video,audio,moofs,patchTemplateSizeCandidates:qualified,diagnostics:data.diagnostics});
 await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);await page.close();console.log('PASS',name,mode);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
}}finally{await browser.close();await server.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(out);}
