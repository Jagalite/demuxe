// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
const [deployment,fixture,output,engine]=process.argv.slice(2);
assert.ok(deployment&&fixture&&output&&['chrome','firefox','webkit'].includes(engine));
const root=resolve(deployment), hash=value=>createHash('sha256').update(value).digest('hex'), media=await readFile(fixture), inputs={};
const browser=await ({chrome:chromium,firefox,webkit}[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage();
 await page.route('https://inspection-owner.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({contentType:'text/html',body:'<body></body>'});
  const target=resolve(root,path.slice(1));if(!target.startsWith(root+sep))return route.abort();
  try{const bytes=await readFile(target);inputs[path]={bytes:bytes.length,sha256:hash(bytes)};return route.fulfill({contentType:'text/javascript',body:bytes});}catch{return route.abort();}
 });
 await page.goto('https://inspection-owner.test/');
 const checks=await page.evaluate(async bytes=>{
  const {inspectMedia}=await import('/dist/index.js');
  const {createMediaBunnyInspector}=await import('/web/providers/mediabunny/formats/inspect-mp4.js');
  const data=new Uint8Array(bytes),base={kind:'bytes',transport:'application-managed',id:'source',size:data.length};
  const inspector=createMediaBunnyInspector();
  const normal=await inspectMedia({...base,read:async(at,n)=>data.slice(at,at+n)},{inspector});
  let closes=0;const source={...base,ownership:'owned',read:async()=>{throw new Error('source permission denied');},close(){closes++;throw new Error('close failed');}};
  let failure;try{await inspectMedia(source,{inspector});}catch(error){failure={code:error.code,message:error.message};}
  let rejection=false,reason=1;try{await inspectMedia({...base,read:async(at,n)=>data.slice(at,at+n)},{inspector:async()=>{throw undefined;}});}catch(error){rejection=true;reason=error;}
  let successCloseRejected=false,successCloseReason=1;try{await inspectMedia({...base,ownership:'owned',read:async(at,n)=>data.slice(at,at+n),close:async()=>{throw undefined;}},{inspector});}catch(error){successCloseRejected=true;successCloseReason=error;}
  return {normal:{status:normal.status,completeFor:normal.completeFor,tracks:normal.tracks.map(t=>t.type)},failure,closes,falsy:{rejected:rejection,undefined:reason===undefined},successClose:{rejected:successCloseRejected,undefined:successCloseReason===undefined}};
 },Array.from(media));
 assert.deepEqual(checks.normal,{status:'partial',completeFor:['container'],tracks:['video','audio']});
 assert.equal(checks.failure.code,'SOURCE_PERMISSION');assert.match(checks.failure.message,/source permission denied/);assert.equal(checks.closes,1);
 assert.deepEqual(checks.falsy,{rejected:true,undefined:true});assert.deepEqual(checks.successClose,{rejected:true,undefined:true});
 const receipt={status:'public-inspection-owner-errors-passed-not-release',browserEngine:engine,browser:browser.version(),harnessSHA256:hash(await readFile(new URL(import.meta.url))),fixture:{bytes:media.length,sha256:hash(media)},inputs,checks,limitations:['Candidate core and selected MP4 inspector only; no complete player or production release qualification.']};
 await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{await browser.close();}
