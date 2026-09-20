// SPDX-License-Identifier: Apache-2.0
// Route-specific submission counters, not a claim of identical compositor semantics.
export function frameObservation(state, config) {
  if(config.video===false)return {kind:'audio-only',presented:null,dropped:null};
  if(state.video)return {kind:'html-video',presented:Number(state.video.total)-Number(state.video.dropped),dropped:Number(state.video.dropped)};
  if(config.player==='movi'&&state.renderQuality)return {kind:'movi-renderer',presented:Number(state.renderQuality.totalVideoFrames)-Number(state.renderQuality.droppedVideoFrames),dropped:Number(state.renderQuality.droppedVideoFrames)};
  if(config.player==='libmedia'&&state.stats?.videoFrameRenderCount!==undefined)return {kind:'avplayer-renderer',presented:Number(state.stats.videoFrameRenderCount),dropped:Number(state.stats.videoFrameDropCount)};
  if(config.player==='demuxe'&&state.diagnostics?.backend?.presentation?.drawn!==undefined)return {kind:'demuxe-retained',presented:Number(state.diagnostics.backend.presentation.drawn),dropped:null};
  throw Error('UNQUALIFIED: no established frame presentation counter for this route');
}
export function validateFrameWindow(samples,config,fps=30) {
  const observations=samples.map(s=>frameObservation(s.state,config));
  const first=observations[0],last=observations.at(-1);
  if(first.kind==='audio-only')return {counter:first.kind,presentedFrames:null,droppedFrames:null};
  for(let i=0;i<observations.length;i++){
    const o=observations[i],prior=observations[Math.max(0,i-1)];
    if(o.kind!==first.kind||!Number.isFinite(o.presented)||o.presented<prior.presented||
      (o.dropped!==null&&(!Number.isFinite(o.dropped)||o.dropped<prior.dropped)))throw Error('Invalid, reset or changed presentation counters');
    if(i&&o.presented===prior.presented)throw Error('Video presentation stalled during CPU window');
  }
  const seconds=(samples.at(-1).at-samples[0].at)/1000,expected=seconds*fps;
  const presented=last.presented-first.presented;
  // Diagnostics arrive asynchronously (up to ~200ms); 12 frames cover both ends.
  // The residual allowance is 1%, not a replacement for recorded drop counters.
  if(Math.abs(presented-expected)>12+expected*.01)throw Error('Presentation cadence outside declared frame budget');
  const dropped=first.dropped===null?null:last.dropped-first.dropped;
  if(dropped!==null&&dropped>Math.max(2,expected*.01))throw Error('Excessive dropped frames');
  return {counter:first.kind,presentedFrames:presented,expectedFrames:expected,droppedFrames:dropped,
    toleranceFrames:12+expected*.01,scope:'Renderer submissions or HTML video counters, not physical display timing; unavailable drop counts stay null'};
}
export function cpuGain(baseline,demuxe){
  if(!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(demuxe)||demuxe<0)throw Error('CPU ratio requires positive baseline and nonnegative Demuxe CPU');
  return 100*(baseline-demuxe)/baseline;
}
