// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const family=process.env.BROWSER??'chromium',out=`results/api-stability/advanced-playback/${family}-${Date.now()}`;
await mkdir(out,{recursive:true});const report={family,passed:false,checks:[]};let browser,page;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
async function retainSnapshots(){
  const snapshots=await page.evaluate(async()=>{
    const snapshots=window.pixelSnapshots?.splice(0)??[];
    return Promise.all(snapshots.map(async({blob,...metadata})=>{
      const png=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
      return {...metadata,png};
    }));
  });
  for(const {png,...metadata} of snapshots){
    const file=`snapshot-${String((report.snapshots?.length??0)+1).padStart(2,'0')}.png`;
    await writeFile(out+'/'+file,Buffer.from(png.split(',')[1],'base64'));
    (report.snapshots??=[]).push({file,...metadata});
  }
}
async function check(name,fn){try{const evidence=await fn();report.checks.push({name,passed:true,evidence});}catch(error){report.checks.push({name,passed:false,error:String(error.stack)});process.exitCode=1;await page.screenshot({path:out+`/failure-${report.checks.length}.png`}).catch(()=>{});}await retainSnapshots();await writeFile(out+'/result.json',JSON.stringify(report,null,2));}
try{
  const origin=await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});});
  browser=await(family==='firefox'?firefox:chromium).launch({headless:true});report.browser=browser.version();page=await browser.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(String(error.stack)));
  await page.goto(origin+'/examples/player-element.html');
  await page.evaluate(async()=>{window.element=document.querySelector('demuxe-player');window.p=await element.ready;p.preview.enabled=false;window.movie=new File([await(await fetch('/fixtures/example.mp4')).blob()],'movie.mp4');await element.open(movie);
    window.pixelSnapshots=[];
    await p.seek(2);});
  const el=page.locator('demuxe-player').first();await el.locator('#settings-toggle').click();
  await el.locator('.advanced-group').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
  await check('Apply mirror through controls preserves paused source and mirrors actual pixels',async()=>{
    await page.evaluate(async()=>{
      window.before={source:p.state.sourceId,time:p.state.currentTime,intent:p.state.playbackIntent};
      window.pixels=async(label)=>{
        const observe=()=>{const video=p.surface,quality=video instanceof HTMLVideoElement?video.getVideoPlaybackQuality?.():null;return {source:p.state.sourceId,time:p.state.currentTime,intent:p.state.playbackIntent,mode:p.state.activeMode,filter:p.diagnostics.videoFilters,backend:p.diagnostics.backend,native:video instanceof HTMLVideoElement?{currentTime:video.currentTime,seeking:video.seeking,readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,quality:quality?{creationTime:quality.creationTime,totalVideoFrames:quality.totalVideoFrames,droppedVideoFrames:quality.droppedVideoFrames,corruptedVideoFrames:quality.corruptedVideoFrames}:null}:null};};
        const beforeCapture=observe(),shot=await p.snapshot({includeSubtitles:false}),afterCapture=observe();
        const image=await createImageBitmap(shot.blob),canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,64,36);image.close();
        const pixels=Array.from(ctx.getImageData(0,0,64,36).data);
        window.pixelSnapshots.push({label,blob:shot.blob,width:shot.width,height:shot.height,mediaTime:shot.mediaTime,actualTime:shot.actualTime,beforeCapture,afterCapture});
        return pixels;
      };window.original=await pixels('native-original');
    });
    await el.locator('#advanced-preset').selectOption('hflip');await el.locator('#advanced-video-form button[type=submit]').click();
    await page.waitForFunction(()=>p.diagnostics.videoFilters==='hflip'&&!p.state.pendingOperation);
    const evidence=await page.evaluate(async()=>{const mirrored=await pixels('hflip');let error=0;for(let y=0;y<36;y++)for(let x=0;x<64;x++)for(let c=0;c<3;c++)error+=Math.abs(mirrored[(y*64+x)*4+c]-original[(y*64+63-x)*4+c]);return {source:p.state.sourceId,time:p.state.currentTime,intent:p.state.playbackIntent,mode:p.state.activeMode,before,mirrorError:error/(64*36*3)};});
    assert.equal(evidence.source,evidence.before.source);assert.equal(evidence.intent,'pause');assert.equal(evidence.mode,'software');assert.ok(Math.abs(evidence.time-evidence.before.time)<.2);assert.ok(evidence.mirrorError<20,JSON.stringify(evidence));return evidence;
  });
  await check('flip, grayscale and negative presets transform the presented image',async()=>{
    const evidence=[];
    for(const preset of ['vflip','lavfi=[format=gray]','negate']){
      await el.locator('#advanced-preset').selectOption(preset);await el.locator('#advanced-video-form button[type=submit]').click();
      await page.waitForFunction(value=>p.diagnostics.videoFilters===value&&!p.state.pendingOperation,preset);
      const metric=await page.evaluate(async preset=>{
        const output=await pixels(preset);let error=0;
        for(let y=0;y<36;y++)for(let x=0;x<64;x++){
          const at=(y*64+x)*4;
          if(preset==='lavfi=[format=gray]')error+=(Math.abs(output[at]-output[at+1])+Math.abs(output[at+1]-output[at+2]))/2;
          else for(let c=0;c<3;c++)error+=Math.abs(output[at+c]-(preset==='vflip'?original[((35-y)*64+x)*4+c]:255-original[at+c]))/3;
        }
        return error/(64*36);
      },preset);
      assert.ok(metric<(preset==='lavfi=[format=gray]'?10:25),`${preset}: pixel error ${metric}`);evidence.push({preset,meanError:metric});
    }
    return evidence;
  });
  await check('invalid filter retains accepted filter, source and draft; Reset recovers',async()=>{
    const before=await page.evaluate(()=>({source:p.state.sourceId,filter:p.diagnostics.videoFilters}));
    await el.locator('#advanced-vf').fill('definitely-not-a-filter');await el.locator('#advanced-video-form button[type=submit]').click();
    await el.locator('#error').waitFor({state:'visible'});await el.locator('#advanced-vf').waitFor({state:'visible'});
    await page.waitForFunction(()=>!p.state.pendingOperation&&!element.shadowRoot.getElementById('advanced-vf').disabled);
    assert.equal(await el.locator('#advanced-vf').inputValue(),'definitely-not-a-filter');
    assert.deepEqual(await page.evaluate(()=>({source:p.state.sourceId,filter:p.diagnostics.videoFilters})),before);
    assert.equal(await page.evaluate(()=>p.state.error),null);await el.locator('#advanced-clear-vf').click();
    await page.waitForFunction(()=>p.diagnostics.videoFilters===''&&!p.state.pendingOperation);
    assert.equal(await el.locator('#advanced-vf').inputValue(),'');await el.locator('#error').waitFor({state:'hidden'});return before;
  });
  await check('gain change while playing preserves intent and accepted source',async()=>{
    await page.evaluate(()=>p.play());await page.waitForFunction(()=>p.state.status==='playing');const source=await page.evaluate(()=>p.state.sourceId);
    await el.locator('#advanced-gain').fill('0.5');await el.locator('#advanced-gain').press('Tab');
    await page.waitForFunction(()=>p.diagnostics.audioGain===.5&&!p.state.pendingOperation);
    assert.deepEqual(await page.evaluate(()=>({source:p.state.sourceId,intent:p.state.playbackIntent})),{source,intent:'play'});
    await page.evaluate(()=>p.pause());
  });
  await check('range and loop apply, clear and source replacement synchronize the controls',async()=>{
    await el.locator('#advanced-start').fill('1');await el.locator('#advanced-end').fill('5');await el.locator('#advanced-range').click();
    await page.waitForFunction(()=>p.state.playbackRange?.start===1&&!p.state.pendingOperation);await el.locator('#advanced-loop-range').click();
    await page.waitForFunction(()=>p.state.loop?.end===5&&!p.state.pendingOperation);await el.locator('#advanced-clear-range').click();await page.waitForFunction(()=>p.state.playbackRange===null&&!p.state.pendingOperation);
    await el.locator('#advanced-vf').fill('unapplied draft');await page.evaluate(()=>element.open(movie));
    await page.waitForFunction(()=>!p.state.pendingOperation);assert.equal(await el.locator('#advanced-vf').inputValue(),'');assert.equal(await el.locator('#advanced-loop').inputValue(),'off');
  });
  report.pageErrors=errors;assert.deepEqual(errors,[]);assert.equal(report.checks.length,5);assert.ok(report.checks.every(c=>c.passed));report.passed=true;
}finally{try{await page?.evaluate(()=>Promise.all([...document.querySelectorAll('demuxe-player')].map(element=>element.destroy())));}finally{await browser?.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');}}
