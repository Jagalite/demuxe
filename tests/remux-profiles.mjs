// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serve} from '../experiments/pipeline-qualification/server.mjs';

const dir='build/remux-profiles',out=`results/remux-profiles/${new Date().toISOString().replaceAll(':','-')}`;
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
const profiles=candidates.filter(([name])=>!['mp4','audio','mp3','ac3','opus'].includes(name));
const mediaPaths={};for(const [name,args,ext] of profiles){mediaPaths[name]=dir+'/'+name+ext;ff(['-i',base,'-c','copy',...args,mediaPaths[name]]);}
if(mediaPaths.multi){const multi=dir+'/multi.mp4';ff(['-i',base,'-f','lavfi','-i','sine=frequency=1703:sample_rate=48000','-t','4','-map','0:v','-map','0:a','-map','1:a','-c:v','copy','-c:a','aac',multi]);ff(['-i',multi,'-map','0','-c','copy',mediaPaths.multi]);}
const isolated=true,server=await serve({isolated,mediaPaths});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const result={browser:browser.version(),isolated,harnessSHA256:await hash('tests/remux-profiles.mjs'),wasmSHA256:await hash('web/engine-remux/remux.wasm'),cases:[]};
try{for(const [name] of profiles){
 const page=await browser.newPage();page.setDefaultTimeout(15000);
 try{
  await page.goto(server.origin+'/experiment/page.html');
  await page.evaluate(async({url,name})=>{
   Object.defineProperty(MediaSource,'canConstructInDedicatedWorker',{value:false});
   window.output=[];const W=Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(['ready','fragment'].includes(data.type)&&data.buffer?.byteLength){if(data.type==='ready')window.output=[];output.push([...new Uint8Array(data.buffer)]);}});}};
   {const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{mode:'native',nativeRemux:'always'});await player.openRemote({url});if(name==='multi'){await player.pause();await player.selectAudioTrack(player.state.audioTracks[1].id);await player.seek(0);}window.remux=player.current.backend.remux;window.video=player.surface;await player.play();}
  },{url:server.origin+'/media/'+name,name});
  await page.waitForFunction(()=>player.properties.get('time-pos')>.3&&remux.eof);
  const bytes=Buffer.concat((await page.evaluate(()=>output)).map(b=>Buffer.from(b))),captured=out+'/'+name+'.bin';await writeFile(captured,bytes);
  const identity={};
  for(const kind of name.startsWith('audio')?['a']:name.startsWith('video')?['v']:['v','a']){
   const decode=file=>ff(['-i',file,'-map',`0:${kind}:${file===mediaPaths.multi&&kind==='a'?1:0}`,...(kind==='v'?['-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo']:['-f','f32le']),'-']);
   const source=decode(mediaPaths[name]),output=decode(captured);identity[kind]={exact:source.equals(output),sourceBytes:source.length,outputBytes:output.length};assert.ok(identity[kind].exact,`${name}: decoded ${kind} identity`);
  }
  await page.evaluate(async()=>{await player.seek(2);});
  await page.waitForFunction(()=>Math.abs(player.properties.get('time-pos')-2)<.5);
  const runtime=await page.evaluate(()=>remux.snapshot().remux);assert.equal(runtime.transport,'pthread');
  result.cases.push({name,passed:true,sourceSHA256:await hash(mediaPaths[name]),identity,runtime});console.log('PASS',name,identity);
 }catch(error){result.cases.push({name,passed:false,error:String(error.stack)});console.log('FAIL',name,String(error));process.exitCode=1;}
 finally{await page.evaluate(()=>window.player?player.destroy():remux.destroy()).catch(()=>{});await page.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');}
}
}finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();console.log(out);}
