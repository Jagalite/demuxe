// SPDX-License-Identifier: Apache-2.0
// Public preview owner on a separately FFmpeg-authored MOV; diagnostic candidate only.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium,firefox,webkit} from 'playwright';
import {closeTestBrowser,closeBrowserObserved} from './head-to-head/browser-exit.mjs';
const family=process.env.DEMUXE_PREVIEW_BROWSER??'chrome',evidence=process.env.DEMUXE_BROWSER_EVIDENCE;
if(!evidence||!['chrome','firefox','webkit'].includes(family))throw Error('Set evidence path and supported browser');
const sha=data=>createHash('sha256').update(data).digest('hex');
const fixture=await readFile('tests/fixtures/mediabunny-independent-avc-red.mov');
const bundle=await build({stdin:{contents:"export {PreviewController} from './src/preview/controller.ts';export {createMediaBunnyPreviewProvider} from './packages/provider-mediabunny/preview-mp4.js';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',write:false});
const receipt={status:'running-not-qualified',family,fixtureSHA256:sha(fixture),fixtureBytes:fixture.length,harnessSHA256:sha(await readFile(new URL(import.meta.url))),bundleSHA256:sha(bundle.outputFiles[0].contents),scope:'FFmpeg-authored synthetic constant-color AVC MOV, test bundle, independent PreviewController; not transfer or release qualification'};
let browser,browserServer;
try{
 if(family==='chrome')browser=await chromium.launch({channel:'chrome',headless:true});
 else if(family==='firefox'){browserServer=await firefox.launchServer({headless:true});browser=await firefox.connect(browserServer.wsEndpoint());}
 else browser=await webkit.launch({headless:true});
 receipt.browser=browser.version();const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.route('https://independent-preview.test/**',route=>route.fulfill({contentType:route.request().url().endsWith('.js')?'text/javascript':'text/html',body:route.request().url().endsWith('.js')?Buffer.from(bundle.outputFiles[0].contents):'<body></body>'}));
 await page.goto('https://independent-preview.test/');
 receipt.observation=await page.evaluate(async data=>{
  const {PreviewController,createMediaBunnyPreviewProvider}=await import('/adapter.js'),file=new Blob([new Uint8Array(data)]);
  let reads=0,closed=0;const provider=createMediaBunnyPreviewProvider({getSource:id=>id==='fixture'?{id,size:file.size,ownership:'owned',read:async(at,n)=>{reads++;return new Uint8Array(await file.slice(at,at+n).arrayBuffer());},close:()=>{closed++;}}:null});
  const owner=new PreviewController([provider],{bucketSeconds:0});owner.setSourceIdentity('fixture');
  try{
   const exact=await owner.getFrame({time:.25,width:160,height:120,exact:true});
   const frame=await owner.getFrame({time:.25,width:160,height:120,exact:false});
   if(exact!==null||!frame||frame.actualTime===null||Math.abs(frame.actualTime-.2)>.002||frame.temporalAccuracy!=='approximate')throw Error('Preview timestamp/accuracy mismatch: '+JSON.stringify({exact:exact&&{actualTime:exact.actualTime,temporalAccuracy:exact.temporalAccuracy},frame:frame&&{actualTime:frame.actualTime,temporalAccuracy:frame.temporalAccuracy},diagnostics:owner.diagnostics,reads,closed}));
   const bitmap=await createImageBitmap(frame.image.blob),canvas=new OffscreenCanvas(160,120),cx=canvas.getContext('2d');cx.drawImage(bitmap,0,0);bitmap.close();const pixel=Array.from(cx.getImageData(80,60,1,1).data);
   if(pixel[0]<170||pixel[1]>100||pixel[2]>130)throw Error('Unexpected represented color: '+JSON.stringify(pixel));
   const observation={exactDeclined:exact===null,actualTime:frame.actualTime,temporalAccuracy:frame.temporalAccuracy,fidelity:frame.fidelity,pixel,reads,closedBeforeDestroy:closed};
   await owner.destroy();observation.closedAfterDestroy=closed;observation.diagnostics=owner.diagnostics;return observation;
  }catch(error){await owner.destroy();throw error;}
 },Array.from(fixture));
 if(errors.length)throw Error('Browser page errors: '+JSON.stringify(errors));
 receipt.status='independent-preview-passed-not-release';
}catch(error){receipt.status='failed-not-qualified';receipt.error=String(error.stack);process.exitCode=1;}
finally{if(browser)try{receipt.cleanup=browserServer?await closeBrowserObserved({close:()=>browserServer.close()},[browserServer.process().pid],{attempts:450}):await closeTestBrowser(browser,family,{attempts:450});}catch(error){receipt.cleanupError=String(error);process.exitCode=1;}await writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');}
