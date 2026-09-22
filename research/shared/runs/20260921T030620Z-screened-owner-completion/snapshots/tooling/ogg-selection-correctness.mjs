// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {serveLab,playerTrial,sha} from './screened-owner-lab.mjs';
const c=JSON.parse(await readFile(process.argv[2],'utf8')),out=c.run+'/'+(process.env.VARIANT||'ogg-selection-v2');await mkdir(out,{recursive:true});
const source=c.build+'/batch15/multiplexed.oga',sourceSha256=sha(await readFile(source));
const profiles=[0,1].map(serial=>({id:'D65-'+serial,source,reference:c.build+'/batch15/selected'+serial+'.oga',adapter:'projectOggPages',adapterModule:'/research/shared/tooling/native-ogg-selection.mjs',adapterOptions:{serial,sourceSha256},remux:'auto',mime:'audio/ogg'}));
await writeFile(out+'/profiles.json',JSON.stringify(profiles,null,2)+'\n');
const server=await serveLab(c),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const result={browser:browser.version(),profiles:[]};const save=()=>writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');
try{
 const page=await browser.newPage();await page.goto(server.origin+'/current/');
 result.output=await page.evaluate(async profiles=>{
  const {projectOggPages}=await import('/research/shared/tooling/native-ogg-selection.mjs'),data=new Uint8Array(await(await fetch('/'+profiles[0].source)).arrayBuffer()),ac=new AudioContext({sampleRate:48000}),records=[];let wrongPair;
  try{
   const decoded=[];
   for(const p of profiles){const view=await projectOggPages(data,p.adapterOptions),ref=new Uint8Array(await(await fetch('/'+p.reference)).arrayBuffer()),a=await ac.decodeAudioData(view.bytes.buffer.slice(0)),b=await ac.decodeAudioData(ref.buffer.slice(0));let differences=0;for(let ch=0;ch<a.numberOfChannels;ch++)for(let i=0;i<a.length;i++)if(a.getChannelData(ch)[i]!==b.getChannelData(ch)[i])differences++;decoded.push(a);records.push({id:p.id,byteExact:view.bytes.length===ref.length&&view.bytes.every((v,i)=>v===ref[i]),frames:a.length,referenceFrames:b.length,channels:a.numberOfChannels,differences,exact:a.length===b.length&&a.numberOfChannels===b.numberOfChannels&&differences===0});}
   wrongPair=decoded[0].getChannelData(0).some((v,i)=>v!==decoded[1].getChannelData(0)[i]);
   const controls=[],hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
   const reject=async(name,bytes,opts={})=>{try{await projectOggPages(bytes,{serial:0,sourceSha256:await hash(bytes),...opts});controls.push({name,rejected:false});}catch(e){controls.push({name,rejected:true,error:e.message});}};
   let bad=data.slice();bad[30]^=1;await reject('CRC corruption with current source digest',bad);await reject('truncation',data.subarray(0,data.length-1));await reject('unknown stream',data,{serial:2});await reject('mix-all request',data,{serial:'all'});await reject('wrong source binding',data,{sourceSha256:'0'.repeat(64)});
   // Remove a complete valid page; all retained page CRCs are still valid.
   const n=27+data[26]+data.subarray(27,27+data[26]).reduce((a,v)=>a+v,0);await reject('missing first stream page',data.subarray(n));
   await reject('missing EOS pages',data.subarray(0,466184));
   return {records,wrongStreamDetected:wrongPair,controls};
  }finally{await ac.close();}
 },profiles);await page.close();
 for(const profile of profiles){const row={id:profile.id};result.profiles.push(row);try{row.reference=await playerTrial(browser,server,profile,false,{lifecycle:true});row.candidate=await playerTrial(browser,server,profile,true,{lifecycle:true});row.passed=row.candidate.duration===row.reference.duration&&row.candidate.errors.length===0&&row.candidate.seeks.every(s=>Math.abs(s.actual-s.target)<.02);}catch(e){row.error=String(e);row.passed=false;}await save();console.log(row.id,row.passed);}
 result.passed=result.output.records.every(r=>r.exact&&r.byteExact)&&result.output.controls.every(r=>r.rejected)&&result.output.wrongStreamDetected&&result.profiles.every(r=>r.passed);
}finally{result.assets=[...server.assets.values()];const cdp=await browser.newBrowserCDPSession();result.processesBeforeClose=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;await browser.close();await server.close();await save();}
console.log('passed',result.passed);if(!result.passed)process.exitCode=1;
