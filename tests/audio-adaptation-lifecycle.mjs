import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER||'chrome',out=`results/optimization-integration/stage2/lifecycle-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const app=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('server timeout')),10000);app.on('error',j);app.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(t);r(m[0])}})});
const bytes=await readFile('build/optimization-fixtures/long-pcm.mkv');let fault='',heldResolve,requests=[];const held=new Set();
const media=createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','authorization,range,if-range');res.setHeader('Access-Control-Expose-Headers','content-range,content-length,etag,accept-ranges');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 if(req.method==='OPTIONS'){res.end();return;}
 requests.push({method:req.method,range:req.headers.range,authorized:req.headers.authorization==='Bearer fixture'});
 if(req.headers.authorization!=='Bearer fixture'){res.writeHead(401);res.end();return;}
 res.setHeader('Accept-Ranges','bytes');res.setHeader('ETag','"fixed-fixture"');
 if(req.method==='HEAD'){res.setHeader('Content-Length',bytes.length);res.end();return;}
 const range=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'');if(!range){res.writeHead(400);res.end();return;}
 const a=+range[1],b=Math.min(+range[2],bytes.length-1);res.writeHead(206,{'Content-Range':`bytes ${a+(fault==='incorrect'?1:0)}-${b}/${bytes.length}`,'Content-Length':b-a+1});
 if(fault==='stall'){held.add(res);res.on('close',()=>held.delete(res));res.flushHeaders();heldResolve?.();return;}
 res.end(bytes.subarray(a,b+1));
});await new Promise(r=>media.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${media.address().port}/fixture.mkv`;
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),cases:[]};
async function setup(page,gain=1){await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async gain=>{await player.destroy();const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always',experimentalAudioAdaptation:'flac',experimentalBufferedNativeSeeks:true,audioGain:gain});},gain)}
async function cleanup(page){await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0)}
try{
 for(const kind of ['bounded-local-gain','authenticated-range','destroy-blocked-read','incorrect-range','reject-pcm32','reject-float','reject-surround']){
  const page=await browser.newPage();page.setDefaultTimeout(20000);const item={kind};result.cases.push(item);fault='';requests=[];
  try{
   await setup(page,kind==='bounded-local-gain'?.5:1);
   if(kind.startsWith('reject-')){
    await page.evaluate(()=>{const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f)});await page.locator('#file').setInputFiles('build/optimization-fixtures/'+kind.slice(7)+'.mkv');
    item.error=await page.evaluate(()=>player.open(document.querySelector('#file').files[0]).then(()=>null,e=>e.message));
    assert.match(item.error,/precision|quantization|mono\/stereo|not qualified/i);
   }else if(kind==='bounded-local-gain'){
    await page.evaluate(()=>{const f=document.createElement('input');f.type='file';f.id='file';document.body.append(f)});await page.locator('#file').setInputFiles('build/optimization-fixtures/long-pcm.mkv');await page.evaluate(()=>player.open(document.querySelector('#file').files[0]));
    await page.waitForTimeout(500);item.initial=await page.evaluate(()=>player.diagnostics);await page.waitForTimeout(500);item.idle=await page.evaluate(()=>player.diagnostics);
    const stats=d=>d.backend.remux.remux.adaptation;
    assert.equal(stats(item.initial).audioSamplesDecoded,stats(item.idle).audioSamplesDecoded);assert.ok(stats(item.idle).audioSamplesDecoded<48000*8);assert.equal(item.idle.plan.id,'native-flac-gain');
    item.buffered=await page.evaluate(async()=>{const r=player.current.backend.remux,worker=r.worker,gen=r.generation;await player.seek(2);return {sameWorker:r.worker===worker,sameGeneration:r.generation===gen,paused:player.state.playbackIntent==='pause'}});
    assert.equal(item.buffered.sameWorker,true);assert.equal(item.buffered.sameGeneration,true);
    await page.evaluate(()=>player.seek(24));item.distant=await page.evaluate(()=>player.diagnostics);assert.ok(stats(item.distant).audioSamplesDecoded<48000*8);assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);
    await page.evaluate(()=>Promise.all([player.seek(3),player.seek(15)]));assert.ok(Math.abs(await page.evaluate(()=>player.state.currentTime)-15)<.15);assert.equal(await page.evaluate(()=>player.properties.get('pause')),true);
   }else{
    const source={url,headers:{Authorization:'Bearer fixture'},allowedOrigins:[new URL(url).origin],immutable:true};
    if(kind==='incorrect-range'){fault='incorrect';const error=await page.evaluate(source=>player.open(source).then(()=>null,e=>e.message),source);assert.match(error,/range|transport/i);item.error=error;}
    else if(kind==='destroy-blocked-read'){
     fault='stall';const blocked=new Promise(r=>heldResolve=r);
     await page.evaluate(source=>{window.opening=player.open(source).then(()=>null,e=>e.code)},source);
     await Promise.race([blocked,new Promise((_,j)=>setTimeout(()=>j(Error('No outstanding read barrier')),10000))]);assert.ok(held.size>0);
     const begin=Date.now();await cleanup(page);item.destroyMs=Date.now()-begin;assert.ok(item.destroyMs<3000);assert.equal(await page.evaluate(()=>opening),'ABORTED');
    }else{await page.evaluate(source=>player.open(source),source);item.diagnostics=await page.evaluate(()=>player.diagnostics);assert.equal(item.diagnostics.plan.id,'native-flac');assert.ok(requests.length>2);assert.ok(requests.every(r=>r.authorized));}
    item.requests=requests;
   }
   await cleanup(page);item.passed=true;
  }catch(error){item.error=String(error.stack);item.state=await page.evaluate(()=>player.diagnostics).catch(()=>null);process.exitCode=1;}
  finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await page.close();for(const r of held)r.destroy();console.log(kind,item.passed?'PASS':item.error);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
 }
}finally{await browser.close();for(const r of held)r.destroy();media.closeAllConnections();await new Promise(r=>media.close(r));app.kill();}
