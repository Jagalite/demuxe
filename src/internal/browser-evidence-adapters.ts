// SPDX-License-Identifier: Apache-2.0
/** Query syntax and observable browser signals, never browser codec support tables. */
export function queryAdapter(api:'canPlayType'|'isTypeSupported',mime:string) {
  if(api==='canPlayType'&&/^video\/(?:x-)?matroska(?:;|$)/.test(mime))return {
    id:'matroska-direct',negativeDecisive:false,
    reason:'Matroska codec-parameter rejection is not qualified as original-file rejection across browsers'
  };
  return {id:api==='canPlayType'?'standard-file':'standard-mse',negativeDecisive:true};
}
export type AudioEvidenceStrength='unknown'|'presence'|'decoded'|'consumed';
export function observeBrowserAudio(media:{webkitAudioDecodedByteCount?:number;mozHasAudio?:boolean;audioTracks?:ArrayLike<{enabled:boolean}>},advancing:boolean) {
  if(typeof media.webkitAudioDecodedByteCount==='number')return {
    adapter:'decoded-byte-counter',ready:media.webkitAudioDecodedByteCount>0,
    strength:(media.webkitAudioDecodedByteCount>0?'decoded':'unknown') as AudioEvidenceStrength
  };
  if(typeof media.mozHasAudio==='boolean')return {
    adapter:'browser-audio-presence-and-clock',ready:media.mozHasAudio&&advancing,
    strength:(media.mozHasAudio?'presence':'unknown') as AudioEvidenceStrength
  };
  const enabled=Array.from(media.audioTracks??[]).some(track=>track.enabled);
  return {adapter:media.audioTracks?'enabled-browser-audio-track-and-clock':'unobservable',ready:enabled&&advancing,
    strength:(enabled?'presence':'unknown') as AudioEvidenceStrength};
}
