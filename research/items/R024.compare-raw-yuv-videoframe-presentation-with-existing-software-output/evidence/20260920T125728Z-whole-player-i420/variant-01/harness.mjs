// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decodePNG} from '../../../../tests/head-to-head/checks.mjs';
const [outArg]=process.argv.slice(2),out=path.resolve(outArg);
await mkdir(out,{recursive:false});
const base=path.resolve('build/head-to-head/assets-component-isolation-01/demuxe'),runtime=path.resolve('build/research-r024-yuv-01'),overlay=path.resolve('build/research-r024-overlay-01'),fixtures=path.resolve('build/research-r024-fixture-01');
const result={qualified:false,scope:'Actual maintained Player, static 320x192 BT709 limited I420 FFV1+stereo PCM; no moving-frame cadence claim',gate:{maxRGB:8,p99RGB:4},trials:[],assets:{}};
const html=`<!doctype html><style>body{margin:0}#host{width:320px;height:192px}canvas{width:320px!important;height:192px!important}</style><div id="host"></div><script type="module">import {Player} from '/web/generated/index.js';window.Player=Player;window.errors=[];window.outputs=[];window.ready=true;</script>`;
let arm='rgb';
const server=createServer(async(req,res)=>{try{for(const[k,v]of Object.entries({'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'}))res.setHeader(k,v);const name=new URL(req.url,'http://local').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(name.includes('..'))throw Error('path');let file=name.startsWith('/media/')?path.join(fixtures,name.slice(7)):path.join(base,name);if(name.startsWith('/web/engine-software-yuv/'))file=path.join(runtime,path.basename(name));if(arm==='candidate'&&['/web/software-full-engine-worker.js','/web/r024-raw-i420.mjs'].includes(name))file=path.join(overlay,name);const bytes=await readFile(file);result.assets[file]=createHash('sha256').update(bytes).digest('hex');res.setHeader('Content-Type',name.endsWith('.wasm')?'application/wasm':/\.(js|mjs)$/.test(name)?'text/javascript':'application/octet-stream');const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range??'');if(m){const lo=+m[1],hi=m[2]?Math.min(+m[2],bytes.length-1):bytes.length-1;res.writeHead(206,{'Content-Range':`bytes ${lo}-${hi}/${bytes.length}`,'Content-Length':hi-lo+1});res.end(bytes.subarray(lo,hi+1));}else res.end(bytes);}catch(e){res.writeHead(404);res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
const save=()=>writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
try{browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
for(arm of ['rgb','yuv','candidate'])for(const fixture of ['gray','color']){
 const trial={arm,fixture,images:[],states:[]};result.trials.push(trial);const page=await browser.newPage({viewport:{width:640,height:400},deviceScaleFactor:1});page.on('pageerror',e=>(trial.pageErrors??=[]).push(String(e)));await page.goto(origin);await page.waitForFunction(()=>ready);
 await page.evaluate(async({arm,fixture})=>{window.player=new Player(document.querySelector('#host'),{mode:'software',width:320,height:192,softwarePresenter:arm==='rgb'?'rgb':'experimental-yuv'});player.addEventListener('error',e=>errors.push(String(e.detail?.message??e.detail)));player.addEventListener('output',e=>outputs.push(e.detail));await player.openRemote({url:location.origin+'/media/'+fixture+'.mkv'});await player.selectTrack('sub','no');await player.play();},{arm,fixture});
 await page.waitForFunction(()=>errors.length||player.properties.get('time-pos')>1,{timeout:30000});
 const state=()=>page.evaluate(()=>({mode:player.mode,position:player.properties.get('time-pos'),diagnostics:player.diagnostics,audio:player.audioDiagnostics(),errors:[...errors]}));trial.states.push(await state());assert.deepEqual(trial.states[0].errors,[]);
 trial.audio=await page.evaluate(()=>{const b=player.current.backend,s=new Float32Array(b.analyser.fftSize);b.analyser.getFloatTimeDomainData(s);let n=0;for(let i=1;i<s.length;i++)if(s[i-1]<0&&s[i]>=0)n++;return{rms:Math.sqrt(s.reduce((a,x)=>a+x*x,0)/s.length),hz:n*b.audioContext.sampleRate/s.length};});assert.ok(trial.audio.rms>.015&&Math.abs(trial.audio.hz-440)<40,'actual audio tone');
 const oracle=decodePNG(await readFile(path.join(fixtures,fixture+'.png')));
 for(const target of [2,0.5,5]){await page.evaluate(async t=>{await player.pause();await player.seek(t);},target);await page.waitForTimeout(250);const image=await page.locator('canvas').screenshot();await writeFile(path.join(out,`${arm}-${fixture}-${target}.png`),image);const im=decodePNG(image);assert.equal(im.width,320);assert.equal(im.height,192);const errors=[];for(let i=0;i<320*192;i++)for(let c=0;c<3;c++)errors.push(Math.abs(im.pixels[i*im.channels+c]-oracle.pixels[i*oracle.channels+c]));errors.sort((a,b)=>a-b);const stat={target,max:errors.at(-1),p99:errors[Math.floor(errors.length*.99)]};trial.images.push(stat);assert.ok(stat.max<=8&&stat.p99<=4,JSON.stringify(stat));}
 await page.evaluate(async()=>{await player.play();});await page.waitForFunction(()=>player.properties.get('time-pos')>5.6);trial.states.push(await state());
 if(arm==='candidate'){const d=trial.states.at(-1).diagnostics.backend;assert.equal(d.softwarePresenter,'research-r024-raw-i420');assert.ok(d.yuv.frames>20);assert.equal(d.yuv.framesCreated,d.yuv.framesClosed);assert.equal(d.yuv.rejected,0);}
 trial.cleanup=await page.evaluate(async()=>{await player.destroy();return{outputs,errors,iframes:document.querySelectorAll('iframe').length};});assert.deepEqual(trial.cleanup.errors,[]);assert.equal(trial.cleanup.iframes,0);trial.passed=true;await page.close();await save();
}result.qualified=true;
}catch(e){result.error=String(e.stack);process.exitCode=1;}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await save();console.log(JSON.stringify({qualified:result.qualified,error:result.error,trials:result.trials.map(t=>({arm:t.arm,fixture:t.fixture,images:t.images,passed:t.passed}))}));}
