// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict';
import {audit} from '../../scripts/audit-wasm.mjs';

// Minimal ABI-shaped modules: static policy tests, not execution evidence.
const leb=n=>{const b=[];do{const v=n&127;n>>>=7;b.push(v|(n?128:0));}while(n);return b;};
const str=s=>[...leb(Buffer.byteLength(s)),...Buffer.from(s)];
const section=(id,b)=>[id,...leb(b.length),...b];
const required=['rm_error','rm_probe','rm_open','rm_start','rm_set_container','rm_step','rm_close',
 'rm_duration','rm_video_codec','rm_audio_codec','malloc','free'];
const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
function fixture({asyncify=false,omit=null,transcode=false,read=true,partial=false}={}){
 const names=[...required,...(transcode?['rm_adapt_audio']:[]),...(asyncify?controls:[])].filter(x=>x!==omit);
 if(partial)names.push('asyncify_get_state');
 return Uint8Array.from([0,97,115,109,1,0,0,0,
  ...section(1,[1,0x60,0,0]),
  ...section(2,[1,...str('env'),...str(read?'__asyncjs__source_read':'unrelated'),0,0]),
  ...section(5,[1,0,1]),
  ...section(7,[...leb(names.length),...names.flatMap(n=>[...str(n),0,0])])]);
}
const tests=[];
function test(name,fn){try{fn();tests.push({name,ok:true});}catch(e){tests.push({name,ok:false,error:String(e.stack)});}}
test('backend-is-explicit',()=>assert.throws(()=>audit(fixture(),{raw:false}),/Explicit/));
test('jspi-shaped-ABI',()=>assert.equal(audit(fixture(),{raw:false,backend:'jspi'}).asyncifyControls,false));
test('asyncify-shaped-ABI',()=>assert.equal(audit(fixture({asyncify:true}),{raw:false,backend:'asyncify'}).asyncifyControls,true));
test('wrong-asyncify-artifact',()=>assert.throws(()=>audit(fixture(),{raw:false,backend:'asyncify'}),/Uninstrumented/));
test('wrong-jspi-artifact',()=>assert.throws(()=>audit(fixture({asyncify:true}),{raw:false,backend:'jspi'}),/Unexpected/));
test('partial-controls-rejected',()=>assert.throws(()=>audit(fixture({partial:true}),{raw:false,backend:'jspi'}),/Unexpected/));
test('missing-remux-export',()=>assert.throws(()=>audit(fixture({omit:'rm_step'}),{raw:false,backend:'jspi'}),/Missing FFmpeg export rm_step/));
test('missing-read-import',()=>assert.throws(()=>audit(fixture({read:false}),{raw:false,backend:'jspi'}),/source-read/));
test('transcode-needs-adaptation',()=>assert.throws(()=>audit(fixture(),{raw:false,backend:'jspi',profile:'transcode'}),/rm_adapt_audio/));
test('transcode-ABI',()=>assert.equal(audit(fixture({transcode:true}),{raw:false,backend:'jspi',profile:'transcode'}).privateMemory,true));
test('partial-asyncify-controls',()=>assert.throws(()=>audit(fixture({asyncify:true,omit:controls[0]}),{raw:false,backend:'asyncify'}),/Uninstrumented/));
const result={scope:'Synthetic Wasm ABI audit negatives; not FFmpeg execution',tests,total:tests.length,passed:tests.filter(x=>x.ok).length};
console.log(JSON.stringify(result,null,2));if(result.passed!==result.total)process.exitCode=1;
