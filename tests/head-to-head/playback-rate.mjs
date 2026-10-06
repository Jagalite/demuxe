// SPDX-License-Identifier: Apache-2.0
// Qualify sustained public media progression, independently of setter acknowledgement.
export function rateObservation(state,beganMs,finishedMs){
  if(!Number.isFinite(beganMs)||!Number.isFinite(finishedMs)||finishedMs<beganMs||finishedMs-beganMs>250)throw Error('Playback-rate snapshot timing is unbounded');
  if(!Number.isFinite(state.position)||state.position<0)throw Error('Playback-rate position is invalid');
  return {wallMs:(beganMs+finishedMs)/2,snapshotWallMs:finishedMs-beganMs,position:state.position};
}
// Public state may be cached between native timeupdate events. Timestamp changes
// in that state in the page, rather than assigning an IPC time to an old value.
export async function observePlaybackRate(readPosition,{now=()=>performance.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  const began=now();
  let previous={position:readPosition(),beganMs:began},first;
  rateObservation(previous,began,now());
  while(now()-began<5000){
    await sleep(10);
    const readBegan=now(),position=readPosition(),finished=now();
    rateObservation({position},readBegan,finished);
    if(position<previous.position)throw Error('Playback-rate timeline moved backward');
    if(position!==previous.position){
      const sample=rateObservation({position},previous.beganMs,finished);
      if(!first)first=sample;
      else if(sample.wallMs-first.wallMs>=2000)return [first,sample];
    }
    previous={position,beganMs:readBegan};
  }
  throw Error('Playback-rate public state did not provide a bounded progression window');
}
export function validatePlaybackRate(samples,rate=1.25){
  if(!Array.isArray(samples)||samples.length!==2||rate!==1.25)throw Error('Invalid sustained playback-rate window');
  for(const sample of samples)if(!Number.isFinite(sample.wallMs)||!Number.isFinite(sample.position)||sample.position<0||!Number.isFinite(sample.snapshotWallMs)||sample.snapshotWallMs<0||sample.snapshotWallMs>250)throw Error('Invalid sustained playback-rate observation');
  const wallSeconds=(samples[1].wallMs-samples[0].wallMs)/1000,advance=samples[1].position-samples[0].position;
  if(wallSeconds<1.8||wallSeconds>3||advance<0)throw Error('Sustained playback-rate window is out of bounds');
  const expectedAdvance=rate*wallSeconds,tolerance=expectedAdvance*.12;
  // The state can have been sampled anywhere inside each IPC interval. Require
  // the entire possible rate interval to match, so endpoint latency cannot make
  // an ignored 1x setter appear to run at 1.25x.
  const uncertaintySeconds=(samples[0].snapshotWallMs+samples[1].snapshotWallMs)/2000;
  const minimumObservedRate=advance/(wallSeconds+uncertaintySeconds);
  const maximumObservedRate=advance/(wallSeconds-uncertaintySeconds);
  if(minimumObservedRate<rate*.88||maximumObservedRate>rate*1.12)throw Error('Sustained playback-rate progression does not match requested 1.25x within snapshot uncertainty');
  return {rate,wallSeconds,advance,expectedAdvance,tolerance,uncertaintySeconds,minimumObservedRate,maximumObservedRate,fractionalError:(advance-expectedAdvance)/expectedAdvance,passed:true};
}
