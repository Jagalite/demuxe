// SPDX-License-Identifier: Apache-2.0
import {Player} from '../../../web/generated/unified-player.js';
import {planAdmission} from '../../../web/generated/internal/playback-plans.js';
import {nativeRejection,remuxRejection} from '../../../web/generated/internal/selection.js';
import {RuntimeCapabilities} from '../../../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../../../web/generated/internal/errors.js';
import {writeFile,createWriteStream} from 'node:fs';
const seed=Number(process.env.SEED||1592639710);let rng=seed;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296};const pick=a=>a[Math.floor(random()*a.length)];
const axes={container:['mp4','mkv','webm','ts'],video:['h264','hevc','vp9','av1','mpeg4'],audio:['aac','opus','flac','pcm_s16le','pcm_s24le','ac3','eac3','dts'],subtitle:['none','text','external-ass','embedded-ass'],feature:['none','gain','audio-filter','video-filter','tone-map'],policy:['lossless','lossy'],native:['verified','failed','unknown'],mse:['verified','failed'],wc:['verified','failed'],software:['available','unavailable']};
const raw=createWriteStream(new URL('cases.jsonl',import.meta.url));const failures=[];const count=Number(process.env.CASES||24000);let passed=0;const coverage=Object.fromEntries(Object.keys(axes).map(k=>[k,new Set()]));
for(let i=0;i<count;i++){
 const c=Object.fromEntries(Object.entries(axes).map(([k,v])=>[k,pick(v)]));for(const[k,v]of Object.entries(c))coverage[k].add(v);
 const probe={format:({mkv:'matroska',ts:'mpegts'})[c.container]??c.container,duration:12,tracks:[{id:'1',type:'video',codec:c.video},{id:'2',type:'audio',codec:c.audio},...(c.subtitle==='embedded-ass'?[{id:'3',type:'sub',codec:'ass'}]:[])]};
 const settings={aid:'auto',sid:'auto',subtitles:true};const f={automatic:pick([true,false]),vf:c.feature==='video-filter'?'hflip':'',af:c.feature==='audio-filter'?'volume=0.5':'',gain:c.feature==='gain'?.5:1,toneMapping:c.feature==='tone-map'?'hdr-to-sdr':'off',hybridAudioFilters:pick([true,false]),adaptation:pick(['flac','opus']),allowLossy:c.policy==='lossy',nativeASS:pick([true,false]),externalFormats:c.subtitle==='external-ass'?['ass']:[],browserTextTracks:c.subtitle==='text',audioOutput:'stereo',nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:pick([true,true,true,false]),mse:pick([true,true,false]),webCodecs:pick([true,true,false]),webAudio:pick([true,true,false]),nativeSourceRejection:nativeRejection(probe,settings),remuxSourceRejection:remuxRejection(probe,settings),hybridSourceRejection:c.video==='mpeg4'?'No Demuxe video bridge':undefined,automaticLossless:true,adaptationSourceQualified:['pcm_s16le','pcm_s24le'].includes(c.audio)&&c.video==='h264'&&c.container==='mkv'};
 // Explicit opt-in construction is independently qualified by the actual runtime.
 const outcome=id=>id.startsWith('native-direct')?(c.native==='unknown'?(i%2===0):c.native==='verified'):id.startsWith('native-remux')?c.mse==='verified':id.startsWith('native-flac')?f.adaptationSourceQualified:id.startsWith('native-opus')?f.allowLossy&&f.adaptationSourceQualified:id.startsWith('hybrid')?c.wc==='verified':c.software==='available';
 const terminal=i%97===0?'SOURCE_PERMISSION':i%101===0?'SOURCE_CHANGED':null;
 const admitted=planAdmission(f);const eligible=admitted.filter(p=>p.eligible);const expected=terminal?undefined:eligible.find(p=>outcome(p.id))?.id;
 const attempted=[];const p=Object.create(Player.prototype);Object.assign(p,{automaticLossless:false,admissionContext:{},runtimeCapabilities:new RuntimeCapabilities(),admissible:()=>admitted,assertOperation(){},record(){},evidence:()=>({decoderOutput:true}),replace:async function(source,mode,s,pr,t,target,a,id){attempted.push(id);if(terminal)throw new PlayerError(terminal,'Injected terminal source failure');if(!outcome(id))throw new PlayerError(id.startsWith('software')?'ASSET_LOAD_FAILED':'UNSUPPORTED_MEDIA','Injected runtime outcome');this.chosen=id;}});
 let error;try{await p.discover({},settings,false,[],0,f.automatic)}catch(e){error=String(e)}
 const issues=[];const evidence=p.runtimeCapabilities.snapshot();if(p.chosen&&evidence.find(r=>r.planId===p.chosen)?.state!=='verified')issues.push('accepted plan not runtime verified');if(evidence.filter(r=>r.state==='verified').length>(p.chosen?1:0))issues.push('unaccepted candidate became authoritative');if(p.chosen!==expected)issues.push('did not choose first verified qualified complete plan');
 if(new Set(attempted).size!==attempted.length)issues.push('candidate retried');
 if(terminal&&attempted.length>1)issues.push('terminal source failure fell through');
 if(attempted.some(id=>!admitted.find(p=>p.id===id)?.eligible))issues.push('semantic gate bypassed');
 if(!f.allowLossy&&attempted.some(id=>id.startsWith('native-opus')))issues.push('lossy plan without permission');
 if(c.native==='unknown'&&eligible.some(p=>p.id.startsWith('native-direct'))&&!attempted[0]?.startsWith('native-direct'))issues.push('unknown Native skipped');
 const rank=id=>id.startsWith('native-direct')?0:id.startsWith('native-remux')?1:id.startsWith('native-flac')?2:id.startsWith('native-opus')?3:id.startsWith('hybrid')?4:5;
 if(p.chosen&&eligible.some(x=>outcome(x.id)&&rank(x.id)<rank(p.chosen)))issues.push('unnecessary transform/backend');
 const row={seed,index:i,case:c,facts:f,attempted,selected:p.chosen??null,expected:expected??null,error,issues};raw.write(JSON.stringify(row)+'\n');if(issues.length)failures.push(row);else passed++;
}
await new Promise(r=>raw.end(r));const summary={seed,cases:count,passed,failed:failures.length,coverage:Object.fromEntries(Object.entries(coverage).map(([k,v])=>[k,[...v]])),scope:'Actual Player.discover and planAdmission; backend execution injected. No browser codec table. Lifecycle authority covered by separate browser suite.',minimalFailingCases:failures.slice(0,20)};
await new Promise((r,j)=>writeFile(new URL('summary.json',import.meta.url),JSON.stringify(summary,null,2),e=>e?j(e):r()));console.log(JSON.stringify(summary));if(failures.length)process.exitCode=1;
