// SPDX-License-Identifier: Apache-2.0
import {definePlayerElement} from './generated/player/index.js';
definePlayerElement();
const $=id=>document.getElementById(id),viewer=$('viewer'),player=window.player=await viewer.ready;
window.playerErrors=[];
const run=work=>work.catch(error=>{if(error.code!=='ABORTED')$('status').textContent=error.message;});
// The standalone playground has one active player. Reuse its shortcut handling
// without changing keyboard ownership for embedded players or page controls.
const playbackKeys=new Set([' ','k','m','f','c','j','l','arrowleft','arrowright','arrowup','arrowdown','home','end','[',']','?','0','1','2','3','4','5','6','7','8','9']);
window.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||!playbackKeys.has(event.key.toLowerCase())||!player.state.sourceId)return;
  if(event.composedPath().some(node=>node instanceof HTMLElement&&(node===viewer||node.matches('demuxe-player,input,select,textarea,button,a,summary,[role="button"],[role="slider"],[role="textbox"],[role="combobox"],[role="menuitem"],[role="dialog"],[role="menu"]')||node.isContentEditable)))return;
  if(viewer.shadowRoot.querySelector('[aria-expanded="true"]')||document.querySelector('dialog[open],[aria-modal="true"]'))return;
  const forwarded=new KeyboardEvent('keydown',{key:event.key,code:event.code,shiftKey:event.shiftKey,repeat:event.repeat,bubbles:true,composed:true,cancelable:true});
  viewer.dispatchEvent(forwarded);
  if(forwarded.defaultPrevented)event.preventDefault();
});
function playbackSummary(state){
  const opening=state.pendingOperation?.kind==='opening';
  const engine={native:'Native',hybrid:'Hybrid',software:'Software'}[state.activeMode];
  const media=state.mediaInfo,details=[];
  const components=[];
  if(engine){
    if(media.video||media.displayWidth)components.push(`Video (${state.activeMode==='software'?'Wasm':state.activeMode==='hybrid'?'native · WebCodecs':'native'})`);
    if(media.audio)components.push(`Audio (${state.activeMode==='native'?'native':'Wasm'})`);
    components.push(`Subtitles (${!state.subtitlesVisible?'off':!media.subtitle?'none selected':state.activeMode==='native'?'on':'Wasm'})`);
  }
  const description=components.join(' - ');
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

const layoutButtons=[...document.querySelectorAll('[data-layout]')];
const layoutParam=new URL(location.href).searchParams.get('layout');
if(layoutButtons.some(button=>button.dataset.layout===layoutParam))viewer.layout=layoutParam;
const syncLayout=()=>{for(const button of layoutButtons)button.setAttribute('aria-pressed',String(button.dataset.layout===viewer.layout));};
for(const button of layoutButtons)button.onclick=()=>{viewer.layout=button.dataset.layout;const url=new URL(location.href);url.searchParams.set('layout',viewer.layout);history.replaceState(null,'',url);syncLayout();};
new MutationObserver(syncLayout).observe(viewer,{attributes:true,attributeFilter:['layout']});
syncLayout();
$('layout-example').onclick=()=>$('demo').click();
