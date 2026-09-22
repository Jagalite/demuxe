// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const dir=`build/remux-jspi-expansion/${process.env.ISOLATED==='1'?'pthread':'jspi'}`,out=`results/remux-jspi/expansion-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(dir,{recursive:true});await mkdir(out,{recursive:true});
const ff=args=>execFileSync('ffmpeg',['-v','error','-y',...args],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
const base=dir+'/base.mp4';
ff(['-f','lavfi','-i','testsrc2=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=997:sample_rate=48000','-t','4','-c:v','libx264','-g','24','-bf','2','-c:a','aac',base]);
const candidates=[
 ['mp4',[],'.mp4'],['mkv',[],'.mkv'],
 ['videomp4',['-an'],'.mp4'],['audiomkv',['-vn'],'.mkv'],
 ['videots',['-an'],'.ts'],['audioflac',['-vn','-c:a','flac'],'.mkv'],['audioopus',['-vn','-c:a','libopus'],'.webm'],
 ['mp3',['-c:a','libmp3lame'],'.mkv'],['flac',['-c:a','flac'],'.mkv'],
 ['vorbis',['-c:v','libvpx','-c:a','vorbis','-strict','experimental','-ac','2'],'.webm'],
 ['video',['-an'],'.mkv'],['audio',['-vn'],'.m4a'],
 ['multi',['-map','0:v','-map','0:a','-map','0:a'],'.mkv'],
 ['ac3',['-c:a','ac3'],'.mkv'],['opus',['-c:a','libopus'],'.mkv'],
 ['vp9',['-c:v','libvpx-vp9','-c:a','libopus'],'.webm'],
];
const profiles=candidates.filter(([name])=>process.env.SCREEN==='1'||!['mp4','audio','mp3','ac3','opus'].includes(name));
const mediaPaths={};for(const [name,args,ext] of profiles){mediaPaths[name]=dir+'/'+name+ext;ff(['-i',base,'-c','copy',...args,mediaPaths[name]]);}
if(mediaPaths.multi){const multi=dir+'/multi.mp4';ff(['-i',base,'-f','lavfi','-i','sine=frequency=1703:sample_rate=48000','-t','4','-map','0:v','-map','0:a','-map','1:a','-c:v','copy','-c:a','aac',multi]);ff(['-i',multi,'-map','0','-c','copy',mediaPaths.multi]);}
mediaPaths.primed=dir+'/primed.mkv';ff(['-i',base,'-c:v','copy','-c:a','aac',mediaPaths.primed]);
const isolated=process.env.ISOLATED==='1',server=await serve({isolated,mediaPaths});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const result={browser:browser.version(),isolated,screening:process.env.SCREEN==='1',harnessSHA256:await hash('tests/remux-jspi-expansion.mjs'),wasmSHA256:await hash(`web/engine-remux${isolated?'':'-jspi'}/remux.wasm`),cases:[]};
try{for(const [name] of profiles){
 const page=await browser.newPage();page.setDefaultTimeout(15000);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async({url,publicAPI,name})=>{
   Object.defineProperty(MediaSource,'canConstructInDedicatedWorker',{value:false});
   window.output=[];const W=Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(['ready','fragment'].includes(data.type)&&data.buffer?.byteLength){if(data.type==='ready')window.output=[];output.push([...new Uint8Array(data.buffer)]);}});}};
   if(publicAPI){const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});await player.openRemote({url});if(name==='multi'){window.output=[];await player.selectAudioTrack(player.state.audioTracks[1].id);}window.remux=player.current.backend.remux;window.video=player.surface;await player.play();}
   else{const {RemuxPlayer}=await import('/web/native-remux-player.js');window.video=document.createElement('video');document.body.append(video);window.remux=new RemuxPlayer(video,{mseOwner:'window'});await remux.open({options:{url},audioTrack:name==='multi'?2:undefined});await video.play();}
  },{url:server.origin+'/media/'+name,publicAPI:process.env.SCREEN!=='1',name});
  await page.waitForFunction(()=>video.currentTime>.3&&remux.eof);
  const bytes=Buffer.concat((await page.evaluate(()=>output)).map(b=>Buffer.from(b))),captured=out+'/'+name+'.bin';await writeFile(captured,bytes);
  const identity={};
  for(const kind of name.startsWith('audio')?['a']:name.startsWith('video')?['v']:['v','a']){
   const decode=file=>ff(['-i',file,'-map',`0:${kind}:${file===mediaPaths.multi&&kind==='a'?1:0}`,...(kind==='v'?['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo']:['-f','f32le']),'-']);
   const source=decode(mediaPaths[name]),output=decode(captured);identity[kind]={exact:source.equals(output),sourceBytes:source.length,outputBytes:output.length};if(process.env.SCREEN!=='1')assert.ok(identity[kind].exact,`${name}: decoded ${kind} identity`);
  }
  await page.evaluate(async()=>{if(window.player)await player.seek(2);else await remux.restart(2);});
  await page.waitForFunction(()=>video.currentTime>=1.9);
  const runtime=await page.evaluate(()=>remux.snapshot().remux);assert.equal(runtime.transport,isolated?'pthread':'jspi');
  result.cases.push({name,passed:true,sourceSHA256:await hash(mediaPaths[name]),identity,runtime});console.log('PASS',name,identity);
 }catch(error){result.cases.push({name,passed:false,error:String(error.stack)});console.log('FAIL',name,String(error));process.exitCode=1;}
 finally{await page.evaluate(()=>window.player?player.destroy():remux.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}
 if(!isolated&&process.env.SCREEN!=='1'){const page=await browser.newPage();try{await page.goto(server.origin+'/experiment/page.html');const error=await page.evaluate(async url=>{const {Player}=await import('/web/generated/index.js');const player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});try{await player.openRemote({url});return null;}catch(error){return String(error);}finally{await player.destroy();}},server.origin+'/media/primed');assert.ok(error,'Declared AAC priming must be rejected');result.cases.push({name:'declared AAC priming rejected',passed:true,error});}finally{await page.close();}}
}finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();console.log(out);}
