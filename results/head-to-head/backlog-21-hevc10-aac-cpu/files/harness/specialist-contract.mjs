// SPDX-License-Identifier: Apache-2.0
// Legacy base recipes contain real/unmarked audio and video; they never qualify
// for the synthetic timeline/tone oracle. Unknown recipes require explicit flags.
const legacyReferenceRecipes=new Set(['hevc-truehd','hevc-dtshd','hevc-atmos','dv5','dv81']);
export function referenceFixture(key,fixture,fallback={}) {
  const streams=fixture.probe?.streams??[];
  const video=streams.find(s=>s.codec_type==='video');
  const audio=streams.find(s=>s.codec_type==='audio');
  const contract={...fixture,label:fixture.label??fallback.label,
    video:!!video,audio:!!audio,referenceScreen:true,
    qualificationLimit:fixture.qualificationLimit??'Bounded changing-video and stereo-output screen; no waveform, discrete channel, lossless, spatial audio, HDR or Dolby Vision fidelity qualification.'};
  if(legacyReferenceRecipes.has(key)){
    contract.markedAudio??=false;contract.markedVideo??=false;
    contract.markerContract='Unmarked legacy base recipe; host-decoded stereo-energy windows and visible changing video only';
  }
  if((audio&&typeof contract.markedAudio!=='boolean')||(video&&typeof contract.markedVideo!=='boolean'))throw Error('Missing explicit specialist marker contract: '+key);
  if(!video&&!audio)throw Error('Missing probed specialist streams: '+key);
  if(video){
    const [n,d=1]=String(video.avg_frame_rate??video.r_frame_rate).split('/').map(Number);
    contract.frameRate=n/d;
    if(!Number.isFinite(contract.frameRate)||contract.frameRate<=0)throw Error('Invalid specialist frame rate: '+key);
  }
  return contract;
}
