// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {referenceAudio,waitReferenceAudio} from './specialist-audio.mjs';
import {markedAudio,markedFixtureBlock} from './checks.mjs';

test('copied and legacy specialist imports cannot enter marked qualification',()=>{
  for(const file of ['library/hdr10-truehd-pgs.mkv','library/hdr10-dtshd-pgs.mkv','library/dv5-atmos-ass.mkv','library/dv81-atmos-ass.mkv']) {
    assert.match(markedFixtureBlock({file,audio:true,video:true}),/metadata missing/);
    assert.match(markedFixtureBlock({file,markedAudio:false,markedVideo:true}),/specialist-screen/);
  }
  assert.equal(markedFixtureBlock({file:'library/control.mkv',markedAudio:true,markedVideo:true}),null);
  assert.equal(markedFixtureBlock({file:'aac.mp4',audio:true,video:true}),null);
  assert.match(markedFixtureBlock({file:'renamed.mkv',markedVideo:false}),/specialist-screen/);
});

test('host oracle rejects silent starts and missing channels; accepts non-tone reference windows',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'specialist-audio-'));
  try {
    const file=path.join(dir,'reference.wav');
    const write=expression=>execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i',expression,'-c:a','pcm_f32le',file]);
    write("aevalsrc='if(lt(t,1),0,0.1*sin(2*PI*220*t))|if(lt(t,1),0,0.1*sin(2*PI*330*t))':s=8000:d=3");
    assert.throws(()=>referenceAudio(file,0),/lacks stereo energy/);
    const proof=referenceAudio(file,1);assert(proof.rms.every(r=>r>.06));
    assert.throws(()=>referenceAudio(file,2.9),/Incomplete/);
    write('aevalsrc=0.1*sin(2*PI*220*t)|0:s=8000:d=3');
    assert.throws(()=>referenceAudio(file,1),/lacks stereo energy/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('browser reference check rejects silence, missing channels and stale seek observations',async()=>{
  let state;
  const page={async waitForTimeout(){},async waitForFunction(fn,arg){globalThis.api={snapshot:()=>state};try{assert(fn(arg),'No reference output');}finally{delete globalThis.api;}}};
  const audio=[{channel:0,rms:.1,hz:220},{channel:1,rms:.1,hz:330}];
  state={position:10.2,audio};await waitReferenceAudio(page,{target:10,duration:.5});
  assert.equal(markedAudio(state),false); // energy screen never implies tone fidelity
  for(const invalid of [{position:1,audio},{position:12,audio},{position:10.2,audio:audio.slice(0,1)},{position:10.2,audio:audio.map(a=>({...a,rms:0}))}]){
    state=invalid;await assert.rejects(waitReferenceAudio(page,{target:10,duration:.5}),/No reference output/);
  }
});
