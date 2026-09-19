// SPDX-License-Identifier: GPL-3.0-or-later
import {definePlayerElement} from './generated/player/index.js';
definePlayerElement();
const $=id=>document.getElementById(id),viewer=$('viewer'),player=window.player=await viewer.ready;
window.playerErrors=[];
const run=work=>work.catch(error=>{if(error.code!=='ABORTED')$('status').textContent=error.message;});
function playbackSummary(state){
  const opening=state.pendingOperation?.kind==='opening';
  const engine={native:'Native',hybrid:'Hybrid',software:'Software'}[state.activeMode];
  const description={native:'Browser playback, with remuxing when needed.',hybrid:'WebCodecs-assisted decoding with Wasm support.',software:'FFmpeg/mpv software decoding in WebAssembly.'}[state.activeMode]||'';
  const media=state.mediaInfo,details=[];
  if(state.sourceId!==null){
    details.push(media.video||media.displayWidth?'Video':media.audio?'Audio':'Media');
    if(media.displayWidth&&media.displayHeight)details.push(`${Math.round(media.displayWidth)} × ${Math.round(media.displayHeight)}`);
    const codecs=[media.video?.codec,media.audio?.codec].filter(Boolean);
    if(codecs.length)details.push(codecs.join(' / '));
    if(state.streamType==='live')details.push('Live');
    else if(Number.isFinite(state.duration)&&state.duration>=0){
      const seconds=Math.floor(state.duration),hours=Math.floor(seconds/3600);
      details.push(hours?`${hours}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
    }
  }
  const values={'summary-engine-description':description,'summary-engine':engine||(opening?'Selecting…':'Not active'),'summary-media':details.join(' · ')||(opening?'Opening media…':'No media loaded')};
  for(const [id,text]of Object.entries(values))if($(id).textContent!==text)$(id).textContent=text;
  $('summary-engine').dataset.active=String(!!engine);
}
player.subscribe(playbackSummary);
viewer.addEventListener('error',e=>{if(e.detail.code==='ABORTED')return;window.playerErrors.push(e.detail);if(window.playerErrors.length>50)window.playerErrors.shift();$('status').textContent=e.detail.message;});
$('demo').onclick=()=>run((async()=>{const response=await fetch(new URL('../fixtures/example.mp4',import.meta.url));if(!response.ok)throw Error('The example is unavailable. Open a local file instead.');await viewer.open(new File([await response.blob()],'example.mp4',{type:'video/mp4'}));})());
