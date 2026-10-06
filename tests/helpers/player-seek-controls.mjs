// SPDX-License-Identifier: Apache-2.0
/** Runs in a browser; exercises the actual element handlers with synthetic DVR ranges. */
export async function probePlayerSeekControls(){
 const element=document.createElement('demuxe-player');document.body.append(element);
 const player=await element.ready,originalSeek=player.seek,descriptor=Object.getOwnPropertyDescriptor(player,'state');
 const state={...player.state,sourceId:1,status:'paused',duration:30,currentTime:8,seekable:[{start:0,end:10},{start:20,end:30}],pendingOperation:null};
 const calls=[],result={};
 try{
  Object.defineProperty(player,'state',{configurable:true,get:()=>state});player.seek=async time=>{calls.push(time);};
  element.seekStep=5;element.update(state);
  const root=element.shadowRoot,stage=root.getElementById('stage'),timeline=root.getElementById('timeline');
  const key=value=>stage.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,composed:true,cancelable:true}));
  key('ArrowRight');await Promise.resolve();result.keyboard=calls.pop();
  root.getElementById('forward').click();await Promise.resolve();result.button=calls.pop();
  timeline.value='13';timeline.dispatchEvent(new Event('input'));timeline.dispatchEvent(new Event('change'));await Promise.resolve();result.slider=calls.pop();
  timeline.value='13';timeline.dispatchEvent(new Event('input'));timeline.value='19';timeline.dispatchEvent(new Event('input'));timeline.dispatchEvent(new Event('change'));await Promise.resolve();result.dragReverse=calls.pop();
  state.currentTime=22;element.update(state);key('ArrowLeft');await Promise.resolve();result.reverse=calls.pop();
  state.seekable=[{start:100,end:130}];state.currentTime=110;state.streamType='live';element.update(state);
  timeline.value='105';timeline.dispatchEvent(new Event('input'));state.seekable=[{start:110,end:140}];element.update(state);
  result.live={label:root.getElementById('time').textContent,value:Number(timeline.value),aria:timeline.getAttribute('aria-valuetext')};
  timeline.dispatchEvent(new Event('change'));await Promise.resolve();result.live.committed=calls.pop();
  state.currentTime=8;state.seekable=[{start:0,end:30}];state.playbackRange={start:5,end:9};element.update(state);
  key('ArrowRight');await Promise.resolve();result.limited=calls.pop();
  return result;
 }finally{player.seek=originalSeek;if(descriptor)Object.defineProperty(player,'state',descriptor);else delete player.state;await element.destroy();element.remove();}
}
