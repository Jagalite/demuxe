// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
let p,start,timer,events=[],samples=[],firstFrame=null,phase='startup';
function snapshot(){return {wall:Date.now(),at:performance.now()-start,phase,state:p?.state,diagnostics:p?.diagnostics,properties:p?Object.fromEntries(p.properties):{},firstFrame};}
async function open(c){
 if(c.baseline){const {WasmPlayer}=await import('/web/generated/internal/wasm-player.js');const configure=WasmPlayer.prototype.configureBuffering;WasmPlayer.prototype.configureBuffering=async function(preparing){await configure.call(this,preparing);await this.command('set','cache','no');};}
 start=performance.now();p=new Player(document.querySelector('#stage'),c.options);window.player=p;
 for(const type of ['playing','waiting','error','seeking','seeked'])p.addEventListener(type,e=>events.push({wall:Date.now(),at:performance.now()-start,phase,type,detail:e.detail}));
 timer=setInterval(()=>{const d=p.diagnostics.backend;if(firstFrame===null&&p.state.currentTime>0&&d?.rendered>0)firstFrame=performance.now()-start;samples.push(snapshot());},100);
 const initial=snapshot();await p.open(new URL('/media/'+c.fixture+'.mp4',location));const opened=performance.now()-start;
 // Historical control overrides only cache before source open.
 const effective={};if(p.mode!=='native')for(const name of ['cache','demuxer-max-bytes','demuxer-max-back-bytes','cache-secs','cache-pause','cache-pause-wait','demuxer-seekable-cache'])effective[name]=await p.current.backend.command('expand-text','${'+name+'}');
 await p.setPlaybackRate(c.rate??1);await p.play();phase='playback';
 return {initial,opened,effective,state:snapshot()};
}
async function seek(target){const before=snapshot(),begin=performance.now();await p.seek(target);return {target,ms:performance.now()-begin,before,after:snapshot()};}
window.api={open,snapshot,seek,pause:()=>p.pause(),play:()=>p.play(),phase:v=>phase=v,data:()=>({events,samples}),close:()=>p.close(),reopen:fixture=>p.open(new URL('/media/'+fixture+'.mp4',location)),destroy:async()=>{clearInterval(timer);await p.destroy();return snapshot();}};
