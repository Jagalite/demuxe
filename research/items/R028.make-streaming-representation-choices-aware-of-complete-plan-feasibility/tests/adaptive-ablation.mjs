// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';
const dir=process.argv[2],source=process.argv[3],input=JSON.parse(await fs.readFile(source+'/input.json'));let browser;const result={};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');if(u.pathname==='/'){res.end('<html></html>');return}if(u.pathname==='/segment'){const v=u.searchParams.get('v'),i=Number(u.searchParams.get('i'));if(u.searchParams.get('fail')){res.writeHead(503).end();return}if(u.searchParams.get('delay'))await new Promise(r=>setTimeout(r,40));res.end(Buffer.from(input.variants[v].packets[i]));return}res.end(await fs.readFile(source+'/'+path.basename(u.pathname)))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{browser=await chromium.launch({channel:'chrome',headless:true});result.browser=browser.version();const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/');result.probe=await page.evaluate(async input=>{
const demand={audio:'en',subtitles:'en',range:'sdr'};const media={en:await(await fetch('/en.wav')).arrayBuffer(),fr:await(await fetch('/fr.wav')).arrayBuffer()};
const variants=Object.entries(input.variants).map(([id,v])=>({id,...v,audio:['en','fr'],subtitles:['en','fr'],range:'sdr'}));variants.push({...variants[1],id:'unsupported',bandwidth:500000,codec:'avc1.FFFFFF'});variants.push({...variants[1],id:'missing-audio',bandwidth:450000,audio:['fr']});
const support={};for(const v of variants){try{support[v.id]=(await VideoDecoder.isConfigSupported({codec:v.codec,codedWidth:64,codedHeight:64})).supported}catch{support[v.id]=false}}
if(!support.low||!support.high||support.unsupported)throw Error('unsupported fixture capability assumptions '+JSON.stringify(support));
const eligible=(v,d)=>support[v.id]&&v.audio.includes(d.audio)&&v.subtitles.includes(d.subtitles)&&v.range===d.range;
class Owner{
 constructor(mode){this.mode=mode;this.video=null;this.audio=null;this.text=null;this.epoch=0;this.commits=[];this.count={videoCreates:0,audioDecodes:0,subtitleInvalidations:0,rejectedPlans:0,fetchedSegments:0,closedVideo:0};this.held=[];this.closed=false;}
 async audioOwner(lang){this.count.audioDecodes++;const c=new OfflineAudioContext(2,96000,48000),b=await c.decodeAudioData(media[lang].slice(0));if(b.length!==96000||b.numberOfChannels!==2)throw Error('audio shape');return {lang,buffer:b};}
 videoOwner(v){const frames=[];const errors=[];const decoder=new VideoDecoder({output:f=>frames.push(f),error:e=>errors.push(String(e))});decoder.configure({codec:v.codec,codedWidth:64,codedHeight:64,colorSpace:{primaries:'smpte170m',transfer:'bt709',matrix:'smpte170m',fullRange:false}});this.count.videoCreates++;return {id:v.id,codec:v.codec,decoder,frames,errors};}
 closeVideo(o){if(!o)return;for(const f of o.frames)f.close();o.frames=[];if(o.decoder.state!=='closed'){o.decoder.close();this.count.closedVideo++;}}
 async transition(index,bw,d=demand,options={}){
 const generation=++this.epoch;if(this.closed)throw Error('closed');let v;
 const ranked=variants.filter(x=>x.bandwidth<=bw).sort((a,b)=>b.bandwidth-a.bandwidth);
 if(options.explicit){v=variants.find(x=>x.id===options.explicit);if(!v||!eligible(v,d))throw Error('explicit plan infeasible');}
 else if(this.mode==='candidate'){v=ranked.find(x=>eligible(x,d));}
 else{v=ranked[0];if(v&&!eligible(v,d)){this.count.rejectedPlans++;v=ranked.find(x=>eligible(x,d));}}
 if(!v)throw Error('no complete plan');
 const changed=!this.video||this.video.id!==v.id,resetAll=this.mode==='baseline'&&changed;
 let video=this.video,audio=this.audio,text=this.text,freshVideo=false;
 try{
 // Prepare every affected owner before publishing any plan state.
 if(changed){video=this.videoOwner(v);freshVideo=true;}
 if(!audio||audio.lang!==d.audio||resetAll)audio=await this.audioOwner(d.audio);
 if(!text||text.lang!==d.subtitles||resetAll){text={lang:d.subtitles,cues:Array.from({length:24},(_,i)=>({timestamp:Math.round(i*1e6/12),text:d.subtitles+'-'+i}))};this.count.subtitleInvalidations++;}
 const q=new URLSearchParams({v:v.id,i:String(index)});if(options.fail)q.set('fail','1');if(options.delay)q.set('delay','1');const response=await fetch('/segment?'+q);if(!response.ok)throw Error('segment fetch '+response.status);const bytes=await response.arrayBuffer();this.count.fetchedSegments++;
 if(generation!==this.epoch)throw Error('stale source');video.decoder.decode(new EncodedVideoChunk({type:'key',timestamp:Math.round(index*1e6/12),data:bytes}));await video.decoder.flush();if(video.errors.length)throw Error(video.errors.join(','));
 const f=video.frames.shift();if(!f||f.timestamp!==Math.round(index*1e6/12))throw Error('timestamp');const canvas=new OffscreenCanvas(64,64),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(f,0,0);const rgba=ctx.getImageData(0,0,64,64).data;let maxError=0;for(let i=0;i<rgba.length;i++)maxError=Math.max(maxError,Math.abs(rgba[i]-v.oracle[index][i]));f.close();canvas.width=canvas.height=0;if(maxError>3)throw Error('picture oracle '+maxError);if(generation!==this.epoch)throw Error('stale source');
 const old=this.video;this.video=video;this.audio=audio;this.text=text;if(old!==video)this.closeVideo(old);
 const row={index,representation:v.id,pts:Math.round(index*1e6/12),maxError,audio:audio.lang,subtitle:text.cues[index].text};this.commits.push(row);return row;
 }catch(e){if(freshVideo&&video!==this.video)this.closeVideo(video);throw e;}
 }
 cancel(){this.epoch++;}
 close(){if(this.closed)return;this.cancel();this.closeVideo(this.video);this.video=null;this.audio=null;this.text=null;this.closed=true;}
}
async function renderAudio(owner){const c=new OfflineAudioContext(2,96000,48000),s=c.createBufferSource();s.buffer=owner.audio.buffer;s.connect(c.destination);s.start();const out=await c.startRendering();let diff=0;for(let ch=0;ch<2;ch++)for(let i=0;i<out.length;i++)diff+=out.getChannelData(ch)[i]!==owner.audio.buffer.getChannelData(ch)[i];s.disconnect();if(diff||c.state!=='closed')throw Error('audio output');return {frames:out.length,mismatches:diff,closed:c.state==='closed'};}
async function trial(mode,controls=false){const owner=new Owner(mode),t=performance.now();let tests={},audio;try{
 for(let i=0;i<24;i++)await owner.transition(i,[150000,350000,600000,150000][i%4]);
 const continuous=owner.commits.slice();if(continuous.some((r,i)=>r.index!==i||r.audio!=='en'||r.subtitle!=='en-'+i))throw Error('continuity');audio=await renderAudio(owner);
 if(controls){const oldAudio=owner.audio,oldText=owner.text;await owner.transition(3,350000);tests.videoChangePreservesAudio=owner.audio===oldAudio;tests.videoChangePreservesText=owner.text===oldText;const oldVideo=owner.video;await owner.transition(4,350000,{...demand,audio:'fr'});tests.audioChangePreservesVideo=oldVideo===owner.video;tests.actualFrenchAudio=(await renderAudio(owner)).mismatches===0;
 const stable={video:owner.video,audio:owner.audio,text:owner.text,n:owner.commits.length};for(const options of [{explicit:'missing-audio'},{explicit:'unsupported'},{fail:true}]){let rejected=false;try{await owner.transition(5,600000,demand,options)}catch{rejected=true}if(!rejected||owner.video!==stable.video||owner.audio!==stable.audio||owner.text!==stable.text||owner.commits.length!==stable.n)throw Error('transaction rollback');}tests.atomicRollback=true;
 const pending=owner.transition(6,150000,demand,{delay:true});owner.cancel();let stale=false;try{await pending}catch(e){stale=/stale/.test(String(e))}if(!stale||owner.commits.length!==stable.n)throw Error('cancel');tests.cancelNoStaleCommit=true;
 await owner.transition(0,150000);tests.backwardSeek=owner.commits.at(-1).pts===0;
 const previous=owner.video;await owner.transition(1,150000,{...demand,subtitles:'fr'});tests.subtitleChangePreservesVideo=owner.video===previous&&owner.text.lang==='fr';
 if(Object.values(tests).some(v=>!v))throw Error('lifecycle '+JSON.stringify(tests));}
 owner.close();return {mode,wallMs:performance.now()-t,continuous,audio,tests,count:owner.count};
 }finally{owner.close();if(owner.count.videoCreates!==owner.count.closedVideo)throw Error('decoder leak');}}
const correctness={candidate:await trial('candidate',true),selective:await trial('selective')};const pairs=[];for(let pair=0;pair<31;pair++){const row={pair};for(const mode of pair%2?['candidate','selective']:['selective','candidate'])row[mode]=await trial(mode);pairs.push(row);}return {support,correctness,pairs,scope:'Actual adaptive prepared-keyframe delivery with WebCodecs video, selectedWebAudio PCM output and authoredsubtitle state. Independent FFmpeg pixeloracle. Research controller compares complete-plan-prefilter/per-track invalidation with bandwidth-first validatedfallback with identical selective-owner retention; timings include final cleanup. No shipping HLS/DASH, physicalHDR, network estimator or production default qualification.'};},input);result.passed=true;}catch(e){result.error=String(e.stack);process.exitCode=1}finally{await browser?.close();server.close();await fs.writeFile(dir+'/results.json',JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify({passed:result.passed,error:result.error}));
