// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/optimization-final/automatic-${family}-${Date.now()}`;
await mkdir(out,{recursive:true});
// Original-track Matroska defeats the cheap MP4 probe without needing adaptation.
execFileSync('ffmpeg',['-v','error','-y','-i','build/optimization-fixtures/gain.mp4','-map','0','-c','copy',out+'/copy-supported.mkv']);
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),10000);server.on('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
const browser=await (family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
const result={family,browser:browser.version(),cases:[]};
try{
 for(const name of ['lossless','lossless-stereo','ass-gain','no-policy','copy-first','copy-mkv-no-policy','copy-mkv','copy-mkv-no-preparation','audio-tail','video-tail','explicit-hybrid'].filter(n=>!process.env.CASES||process.env.CASES.split(',').includes(n))){
  const page=await browser.newPage();page.setDefaultTimeout(20000);const item={name};result.cases.push(item);
  try{
   const preparationRequests=[];
   page.context().on('request',request=>{if(request.url().includes('/engine-adaptation/'))preparationRequests.push(request.url());});
   if(name==='copy-mkv-no-preparation')await page.context().route('**/engine-adaptation/**',route=>route.fulfill({status:404,body:'Optional preparation assets unavailable'}));
   await installPackageEntrypoint(page, origin);await page.goto(origin+'/examples/custom-controls.html');
   await page.evaluate(async name=>{
    await player.destroy();const {Player}=await import('/web/generated/index.js');window.errors=[];
    window.player=new Player(document.querySelector('#surface'),{nativeRemux:['copy-first','copy-mkv-no-policy','copy-mkv','copy-mkv-no-preparation'].includes(name)?'auto':'always',automaticAudioAdaptation:['no-policy','copy-mkv-no-policy'].includes(name)?undefined:'lossless',mode:name==='explicit-hybrid'?'hybrid':undefined,experimentalBufferedNativeSeeks:true,experimentalNativeASS:name==='ass-gain',audioGain:name==='ass-gain'?.5:1});
    player.addEventListener('error',e=>errors.push(e.detail));const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f);
   },name);
   const fixture=name==='copy-first'?'gain.mp4':['audio-tail','video-tail'].includes(name)?name+'.mkv':name==='lossless-stereo'?'automatic-release-s16.mkv':['lossless','ass-gain','no-policy'].includes(name)?'automatic-release.mkv':'automatic-lossless.mkv';
   await page.locator('#file').setInputFiles(name.startsWith('copy-mkv')?out+'/copy-supported.mkv':'build/optimization-fixtures/'+fixture);
   await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
   if(name==='ass-gain')await page.evaluate(async()=>{const bytes=await(await fetch('/fixtures/qualification.ass')).arrayBuffer();await player.addSubtitle(new File([bytes],'qualified.ass'));});
   const adapted=['lossless','lossless-stereo','ass-gain'].includes(name);
   assert.equal(await page.evaluate(()=>player.mode),name==='explicit-hybrid'?'hybrid':'native');
   item.open=await page.evaluate(()=>player.diagnostics);
   if(name.startsWith('copy-')){
    if(name==='copy-first')assert.equal(item.open.plan.id,'native-direct');
    else if(family==='firefox')assert.equal(item.open.plan.id,'native-direct'); // Qualified AVC copy probe now supplies the browser configuration.
    else assert.ok(['native-direct','native-remux'].includes(item.open.plan.id));
    assert.deepEqual(preparationRequests,[],'Copy-compatible sources must never load optional preparation assets');
   }
   else if(adapted)assert.equal(item.open.plan.id,name.startsWith('lossless')?'native-flac':'native-flac-ass-gain');
   else if(name==='no-policy')assert.equal(item.open.plan.id,'native-transcode');
   else if(name.endsWith('-tail'))assert.equal(item.open.plan.id,'native-video-mpv-audio');
   await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>.5);
   if(name.endsWith('-tail'))await page.waitForFunction(()=>player.diagnostics.backend.mpvAudio.estimatedAudioPresentationTime>0);
   item.output=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=36;c.getContext('2d').drawImage(player.surface,0,0,64,36);return {pixels:c.getContext('2d').getImageData(0,0,64,36).data.some((v,i)=>i%4!==3&&v>30),diagnostics:player.diagnostics};});
   assert.equal(item.output.pixels,true);await page.evaluate(()=>player.pause());
   if(adapted){
    await page.waitForTimeout(400);const first=await page.evaluate(()=>player.diagnostics.backend.remux.remux.adaptation.audioSamplesDecoded);
    await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>player.diagnostics.backend.remux.remux.adaptation.audioSamplesDecoded),first);assert.ok(first<48000*8);
    await page.evaluate(()=>player.seek(2));assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);
    await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>2.5);
    item.seek=await page.evaluate(()=>player.diagnostics);
   }
   assert.deepEqual(await page.evaluate(()=>errors),[]);
   await page.evaluate(()=>player.destroy());for(let i=0;i<40&&page.workers().length;i++)await page.waitForTimeout(50);assert.equal(page.workers().length,0);item.passed=true;
  }catch(error){item.error=String(error.stack);item.diagnostics=await page.evaluate(()=>player.diagnostics).catch(()=>null);process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();console.log(name,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();server.kill();}

// BEGIN installed-package entrypoint adapter (keep identical across standalone harnesses).
async function installPackageEntrypoint(page, origin) {
 const runtime = process.env.DEMUXE_RUNTIME_ROOT;
 if (!runtime) return;
 const {readFile} = await import('node:fs/promises');
 const {join} = await import('node:path');
 const {createHash} = await import('node:crypto');
 let manifest;
 try { manifest = JSON.parse(await readFile(join(runtime, 'release-manifest.json'), 'utf8')); }
 catch (error) { if (error.code === 'ENOENT') return; throw error; }
 const entry = manifest.files?.['index.js'];
 if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Installed package manifest lacks index.js digest');
 const body = await readFile(join(runtime, 'index.js'));
 if (body.length !== entry.bytes || createHash('sha256').update(body).digest('hex') !== entry.sha256) throw Error('Installed package index.js differs from manifest');
 // Exact URL only: all dependencies and other routes retain the real HTTP server.
 await page.route(url => url.href === new URL('/index.js', origin).href, route => route.fulfill({status:200, contentType:'text/javascript', body}));
}
// END installed-package entrypoint adapter.
