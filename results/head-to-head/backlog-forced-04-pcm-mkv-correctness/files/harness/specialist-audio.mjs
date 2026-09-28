// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// Presence-only oracle, deliberately not a waveform/fidelity comparison.
export function referenceAudio(file, target) {
  const duration=2;
  const argv=['-nostdin','-v','error','-ss',String(target),'-i',file,'-vn','-t',String(duration),'-ac','2','-ar','8000','-f','f32le','-'];
  const bytes=execFileSync('ffmpeg',argv,{timeout:30000});
  assert(bytes.length>=8000*2*4*(duration-.05) && bytes.length%8===0,'Incomplete host audio reference');
  const rms=[0,1].map(channel=>{
    let sum=0;
    for(let i=channel*4;i<bytes.length;i+=8)sum+=bytes.readFloatLE(i)**2;
    return Math.sqrt(sum/(bytes.length/8));
  });
  assert(rms.every(value=>Number.isFinite(value)&&value>.003),`Host reference lacks stereo energy at ${target}: ${rms}`);
  return {target,duration,rms,argv,scope:'Host-decoded stereo energy only; no channel or content fidelity'};
}

export async function waitReferenceAudio(page, reference) {
  // Wait for a post-seek observation, not the analyser's retained pre-seek value.
  await page.waitForTimeout(180);
  await page.waitForFunction(({target,duration})=>{
    const state=api.snapshot();
    return state.position>=target && state.position<=target+duration &&
      [0,1].every(channel=>state.audio.some(a=>a.channel===channel&&a.rms>.003));
  },reference,{timeout:7000});
}
