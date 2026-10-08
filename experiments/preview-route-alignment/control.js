// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
export async function shakaControl(file='dash/main.mpd'){
 const player=new Player(document.querySelector('#surface'),{mode:'native',automaticSelection:false,preview:false,remuxRuntime:'off'}),samples=[],events=[];
 const pause=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){if(this===player.surface)events.push({name:'pause-call',stack:new Error().stack});return pause.call(this);};
 try{
  await player.openRemote({url:new URL('/media/'+file,location.href).href,format:'dash'});
  for(const name of ['pause','play','waiting','stalled','suspend','ended'])player.surface.addEventListener(name,()=>events.push({name,at:performance.now(),time:player.surface.currentTime}));
  await player.play();
  for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,500));const v=player.surface;samples.push({time:v.currentTime,paused:v.paused,ready:v.readyState,visibility:document.visibilityState,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),frames:v.getVideoPlaybackQuality().totalVideoFrames});}
  return {samples,events};
 }finally{await player.destroy();HTMLMediaElement.prototype.pause=pause;}
}
