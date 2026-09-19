// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';import {spawn} from 'node:child_process';import {writeFile,mkdir} from 'node:fs/promises';
const family=process.env.BROWSER||'chrome',out=`results/optimization-ass-fixes/style-${family}-${Date.now()}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const origin=await new Promise(r=>server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)r(m[0])}));
const browser=await(family==='firefox'?firefox:chromium).launch(family==='firefox'?{headless:true}:{channel:'chrome',headless:true});const page=await browser.newPage();const result={};
try{await page.goto(origin+'/examples/custom-controls.html');await page.evaluate(async()=>{
await player.destroy();const {Player}=await import('/web/generated/index.js');document.querySelector('#surface').style.width='640px';window.player=new Player(document.querySelector('#surface'),{mode:'native',experimentalNativeASS:true});await player.open(new File([await(await fetch('/fixtures/example.mp4')).arrayBuffer()],'movie.mp4'));
const ass=`[Script Info]
ScriptType: v4.00+
PlayResX: 640
PlayResY: 360
ScaledBorderAndShadow: no
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,28,&H0000FF00,&H0000FF00,&H00FF0000,&H00000000,0,0,0,0,100,100,0,0,1,10,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:12.00,Default,,0,0,0,,{\\an7\\pos(100,100)\\p1}m 0 0 l 80 0 80 40 0 40`;
await player.addSubtitle(new File([ass],'border.ass'));await player.seek(2);
});
async function measure(){return page.evaluate(()=>{const c=player.current.backend.ass.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let minY=c.height,maxY=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i+1]>240&&d[i]<10&&d[i+2]<10&&d[i+3]>240){minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}const row=Math.floor((minY+maxY)/2),green=[],blue=[];for(let x=0;x<c.width;x++){const i=(row*c.width+x)*4;if(d[i+3]<240)continue;if(d[i+1]>240&&d[i]<10&&d[i+2]<10)green.push(x);if(d[i+2]>240&&d[i]<10&&d[i+1]<10)blue.push(x)}return {source:[player.surface.videoWidth,player.surface.videoHeight],canvas:[c.width,c.height],green:[green[0],green.at(-1)],blue:[blue[0],blue.at(-1)],leftBorder:green[0]-blue[0],rightBorder:blue.at(-1)-green.at(-1)};})}
await page.waitForFunction(()=>player.current.backend.ass.stats.renders>0);await page.waitForTimeout(100);result.full=await measure();
await page.evaluate(()=>{document.querySelector('#surface').style.width='320px'});await page.waitForFunction(()=>player.current.backend.ass.canvas.width===320);await page.waitForTimeout(100);result.half=await measure();
assert.equal(result.full.leftBorder,10);assert.equal(result.full.rightBorder,10);
assert.equal(result.half.leftBorder,5);assert.equal(result.half.rightBorder,5);
await page.evaluate(()=>{document.querySelector('#surface').style.width='640px'});await page.waitForFunction(()=>player.current.backend.ass.canvas.width===640);result.restored=await measure();assert.deepEqual(result.restored,result.full);
await page.evaluate(()=>player.destroy());await page.waitForTimeout(100);assert.equal(page.workers().length,0);result.passed=true;console.log(result);
}finally{await page.evaluate(()=>player?.destroy()).catch(()=>{});await browser.close();server.kill();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n')}
