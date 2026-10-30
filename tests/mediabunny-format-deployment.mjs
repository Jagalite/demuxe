// SPDX-License-Identifier: Apache-2.0
// Exercise two explicitly selected deployment entries and their independent fetches.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium,firefox,webkit} from 'playwright';
const deployment=process.argv[2],fixture=process.argv[3],receiptPath=process.argv[4];
if(!deployment||!fixture||!receiptPath)throw Error('Pass composed deployment, MP4 fixture and receipt path');
const kind=process.env.DEMUXE_FORMAT_KIND??'mp4';assert.ok(['mp4','webm'].includes(kind));
const browserName=process.env.DEMUXE_TEST_BROWSER??'chrome';assert.ok(['chrome','firefox','webkit'].includes(browserName));
const root=resolve(deployment),manifest=JSON.parse(await readFile(join(root,'demuxe-mediabunny-format-assets.json'),'utf8'));
assert.deepEqual(manifest.entries.map(entry=>entry.name),['inspect-'+kind,'preview-'+kind]);
const fixtureBytes=await readFile(fixture),requests=[];let browser;
try{
 browser=await ({chrome:chromium,firefox,webkit}[browserName]).launch({...(browserName==='chrome'?{channel:'chrome'}:{}),headless:true});const page=await browser.newPage();
 await page.route('https://formats.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;if(path==='/')return route.fulfill({contentType:'text/html',body:'<body></body>'});
  if(path.startsWith('/web/providers/mediabunny/formats/'))requests.push(path);const target=resolve(root,path.slice(1));if(!target.startsWith(root+sep))return route.abort();
  try{return route.fulfill({contentType:'text/javascript',body:await readFile(target)});}catch{return route.abort();}
 });
 await page.goto('https://formats.test/');
 assert.deepEqual(requests,[],'No format entry may be fetched before application demand');
 const result=await page.evaluate(async ({bytes,kind})=>{
  const input=new Uint8Array(bytes),source={kind:'bytes',transport:'application-managed',id:'fixture',size:input.length,ownership:'borrowed',read:async(at,n)=>input.slice(at,at+n)};
  const {inspectMedia}=await import('/dist/index.js');
  const {createMediaBunnyInspector}=await import('/web/providers/mediabunny/formats/inspect-'+kind+'.js');
  const facts=await inspectMedia(source,{assetBase:'https://formats.test/',inspector:createMediaBunnyInspector()});
  return {status:facts.status,completeFor:facts.completeFor,tracks:facts.tracks.map(track=>track.type),bytesRead:facts.bytesRead};
 },{bytes:Array.from(fixtureBytes),kind});
 assert.equal(result.status,'partial');assert.deepEqual(result.completeFor,['container']);assert.deepEqual(result.tracks,kind==='mp4'?['video','audio']:['video']);
 assert.deepEqual(requests,['/web/providers/mediabunny/formats/inspect-'+kind+'.js']);
 const preview=await page.evaluate(async ({bytes,kind})=>{
  const input=new Uint8Array(bytes),source={id:'fixture',size:input.length,ownership:'borrowed',read:async(at,n)=>input.slice(at,at+n)};
  const {PreviewController}=await import('/dist/index.js');
  const {createMediaBunnyPreviewProvider}=await import('/web/providers/mediabunny/formats/preview-'+kind+'.js');
  const provider=createMediaBunnyPreviewProvider({getSource:id=>id==='fixture'?source:null});
  const controller=new PreviewController([provider],{bucketSeconds:0,timeoutMs:5000});controller.setSourceIdentity('fixture');
  try{
   const frame=await controller.getFrame({time:.25,width:64,height:48,exact:false});
   if(!frame)throw Error('Preview decoder declined fixture');const bitmap=await createImageBitmap(frame.image.blob);const size=[bitmap.width,bitmap.height];const canvas=new OffscreenCanvas(...size),pixels=canvas.getContext('2d');pixels.drawImage(bitmap,0,0);bitmap.close();const color=Array.from(pixels.getImageData(32,24,1,1).data);
   return {size,time:frame.actualTime,accuracy:frame.temporalAccuracy,fidelity:frame.fidelity,color};
  }finally{await controller.destroy();await provider.release();}
 },{bytes:Array.from(fixtureBytes),kind});
 assert.deepEqual(preview.size,[64,48]);assert.ok(Math.abs(preview.time-.2)<.001);assert.equal(preview.accuracy,'approximate');assert.equal(preview.fidelity,'reduced');assert.ok(preview.color[0]>180&&preview.color[1]<80&&preview.color[2]<110);assert.deepEqual(requests,['/web/providers/mediabunny/formats/inspect-'+kind+'.js','/web/providers/mediabunny/formats/preview-'+kind+'.js']);
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const receipt={status:'selected-format-delivery-fixture-passed-not-release',browserEngine:browserName,browser:browser.version(),kind,harnessSHA256:hash(await readFile(new URL(import.meta.url))),fixture:{bytes:fixtureBytes.length,sha256:hash(fixtureBytes)},entries:manifest.entries,requests,result,preview,limitations:['One fixture per browser run; not broad browser or release qualification','Requests are browser-route observations; distribution and source notices remain separate']};
 await import('node:fs/promises').then(fs=>fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n'));console.log(JSON.stringify(receipt));
}finally{await browser?.close();}
