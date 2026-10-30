// SPDX-License-Identifier: Apache-2.0
// Decode the packaged streaming worker's emitted packets independently of MSE.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const root=resolve(process.env.DEMUXE_COMPOSED_DEPLOYMENT??''),evidence=process.env.DEMUXE_BROWSER_EVIDENCE,family=process.env.DEMUXE_PUBLIC_BROWSER??'webkit';
if(!process.env.DEMUXE_COMPOSED_DEPLOYMENT||!evidence||!['webkit','chrome'].includes(family))throw Error('Set deployment, evidence and supported browser');
const hash=x=>createHash('sha256').update(x).digest('hex'),fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url));
const manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),asset=manifest.assets.find(x=>x.path==='web/providers/mediabunny/mp4-stream.js');assert.ok(asset);
const worker=await readFile(join(root,asset.path));assert.equal(worker.length,asset.bytes);assert.equal(hash(worker),asset.sha256);
const packageRoot=resolve('packages/provider-mediabunny'),library=await build({entryPoints:[join(packageRoot,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false});
const receipt={status:'running-not-qualified',browserEngine:family,harnessSHA256:hash(await readFile(fileURLToPath(import.meta.url))),manifestSHA256:hash(manifestBytes),fixtureSHA256:hash(fixture),workerSHA256:hash(worker),librarySHA256:hash(library.outputFiles[0].contents),limits:['Full worker output is collected only in this finite test; production remains incremental','WebCodecs decoding of worker bytes is independent of MSE presentation and cannot establish audible output','One synthetic local AVC/AAC fixture at target zero, not release qualification']};
let server,browser;try{
 server=createServer((req,res)=>{const path=new URL(req.url,'http://127.0.0.1').pathname,headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store'};if(path==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html'});res.end('<!doctype html>');}else if(path==='/library.js'){res.writeHead(200,{...headers,'Content-Type':'text/javascript'});res.end(Buffer.from(library.outputFiles[0].contents));}else if(path==='/worker.js'){res.writeHead(200,{...headers,'Content-Type':'text/javascript'});res.end(worker);}else{res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base='http://127.0.0.1:'+server.address().port+'/';browser=await(family==='chrome'?chromium:webkit).launch({headless:true,...family==='chrome'?{channel:'chrome'}:{}});receipt.browser=browser.version();const page=await browser.newPage();await page.goto(base);
 receipt.result=await page.evaluate(async({data})=>{
  const r=await import('/library.js'),digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const file=new File([new Uint8Array(data)],'fixture.mp4'),worker=new Worker('/worker.js',{type:'module'}),parts=[];let serial=0;
  const receive=(command,type)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('Worker response timeout: '+type)),10000);const onMessage=({data})=>{if(data?.type==='error')finish(Error(data.message));else if(data?.type===type)finish(undefined,data);};const onError=event=>finish(Error(event.message));function finish(error,value){clearTimeout(timer);worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);error?reject(error):resolve(value);}worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);worker.postMessage(command);});
  try{
   await receive({type:'configure',file,sourceTracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'aac',sampleRate:48000,channels:2}],target:0},'producer-ready');
   const negotiation=await receive({type:'init'},'negotiate');const ready=await receive({type:'select-container',container:'mp4'},'ready');parts.push(new Uint8Array(ready.buffer));
   for(;;){const next=await receive({type:'next',id:++serial},'fragment');if(next.buffer.byteLength)parts.push(new Uint8Array(next.buffer));if(!next.more)break;if(serial>1000)throw Error('Fragment limit exceeded');}
   const output=new Blob(parts,{type:'video/mp4'});const signatures=async(blob,bias)=>{
    const input=new r.Input({formats:[r.MP4,r.QTFF],source:new r.BlobSource(blob)}),result=[];
    try{for(const track of await input.getTracks()){
     const config=await track.getDecoderConfig(),resolution=track.type==='audio'?48000:57600,packets=[],pcm=[],signal=Array.from({length:2},()=>({sum:0,re440:0,im440:0,re660:0,im660:0}));let frames=0;
     for await(const packet of new r.EncodedPacketSink(track).packets())packets.push({time:(Math.round(packet.timestamp*resolution)-bias*resolution)/resolution,duration:packet.duration,type:packet.type,sha256:await digest(packet.data)});
     if(track.type==='audio')for await(const sample of new r.AudioSampleSink(track).samples())try{if(sample.sampleRate!==48000||sample.numberOfChannels!==2)throw Error('Audio layout changed');for(let c=0;c<2;c++){const plane=new Float32Array(sample.numberOfFrames);sample.copyTo(plane,{format:'f32-planar',planeIndex:c});pcm.push(await digest(plane));const s=signal[c];for(let i=0;i<plane.length;i++){const v=plane[i],a=2*Math.PI*440*(frames+i)/48000,b=2*Math.PI*660*(frames+i)/48000;s.sum+=v*v;s.re440+=v*Math.cos(a);s.im440+=v*Math.sin(a);s.re660+=v*Math.cos(b);s.im660+=v*Math.sin(b);}}frames+=sample.numberOfFrames;}finally{sample.close();}
     const audioSignal=track.type==='audio'?signal.map(s=>({rms:Math.sqrt(s.sum/frames),tone440:Math.hypot(s.re440,s.im440)/frames,tone660:Math.hypot(s.re660,s.im660)/frames})):undefined;
     result.push({type:track.type,codec:config?.codec,description:config?.description?Array.from(new Uint8Array(config.description)):null,packets,frames,pcm,...audioSignal?{audioSignal}:{}});
    }return result.sort((a,b)=>a.type.localeCompare(b.type));}finally{input.dispose();}
   };
   const before=await signatures(file,0),after=await signatures(output,1);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Worker packet or decoded PCM preservation differs');
   const audio=after.find(x=>x.type==='audio');if(!audio||audio.frames!==153600||audio.packets.length!==150||audio.audioSignal.some((s,i)=>s.rms<=.01||(i===0?s.tone440<=2*s.tone660:s.tone660<=2*s.tone440)))throw Error('Unexpected AAC sample extent or decoded signal');
   return {negotiation,fragments:serial,outputBytes:output.size,outputSHA256:await digest(await output.arrayBuffer()),sourceTracks:before,tracks:after,workerRetired:true};
  }finally{worker.postMessage({type:'close'});worker.terminate();}
 },{data:Array.from(fixture)});
 receipt.status='finite-worker-packet-webcodecs-pcm-passed-not-mse';
}catch(error){receipt.status='failed-not-qualified';receipt.error={message:error.message,stack:error.stack};throw error;}
finally{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await writeFile(evidence,JSON.stringify(receipt,null,2)+'\n');}
