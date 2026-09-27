// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Run the production worker RPC handlers with a static cue oracle and controlled
// timers. Demux delay sleeps are stubbed separately from deadline timers. Keep the decoded timing epoch constant: crossing a cue is not decoding.
const source=await readFile(new URL('../web/mpv-subtitle-worker.js',import.meta.url),'utf8');
function worker({ass=false}={}){
 let timingEpoch=7,now=0,eof=false,complete=false;
 const calls={seeks:0,completionChecks:0,updates:0};
 const messages=[],timers=new Map();let id=0;
 const heap=new Uint8Array(64),view=new DataView(heap.buffer);
 const engine={HEAPU8:heap,HEAP32:new Int32Array(heap.buffer),
  _subtitle_service_visual_schedule(seconds,pointer){view.setFloat64(pointer,seconds<.5?.5:seconds<35.8?35.8:-1,true);view.setUint32(pointer+8,timingEpoch,true);return ass&&!complete?0:1;},
  _subtitle_service_ass_scan_needed(){return ass&&!complete;},
  _subtitle_service_ass_scan_complete(){calls.completionChecks++;if(eof)complete=true;return complete;},
  _subtitle_service_ass_scan_begin(){throw Error('Unexpected speculative scan');},
  _subtitle_service_block(){},_subtitle_service_update(){calls.updates++;return 1;},
  _subtitle_service_render(){return 1;},_subtitle_service_av_chains(){return 0;},
  _subtitle_service_text(){return 0;},_web_subtitle_ptr(){return 16;},
  _subtitle_service_select(){return 0;},_subtitle_service_seek(){calls.seeks++;eof=false;return 0;},
  _subtitle_service_bitmap_recovery_point(){return -1;}};
 const context=vm.createContext({onmessage:null,postMessage:m=>messages.push(m),TextDecoder,AbortController,
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,due:now+ms});return id;},
  clearTimeout:id=>timers.delete(id),testEngine:engine,
  SubtitleOverlay:class{serial=0;clear(){}read(){return {surface:null};}draw(){}},
  OffscreenCanvas:class{getContext(){return {};}transferToImageBitmap(){return {};}}});
 vm.runInContext(source.replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',JSON.stringify('file:///worker.js')).replace('const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));','const delay=async()=>{};')+'\nengine=testEngine;selectedTrack=true;timingPointer=0;textPointer=12;',context);
 return {calls,setEOF:()=>{eof=true;},timers,messages,advanceTo(milliseconds){
  assert.ok(milliseconds>=now);now=milliseconds;
  for(const [id,timer] of [...timers])if(timer.due<=now){timers.delete(id);timer.fn();}
 },setEpoch:epoch=>{timingEpoch=epoch;},async rpc(type,seconds=0){messages.length=0;context.onmessage({data:{id:++id,type,seconds,width:320,height:180,force:true,rate:1,running:true,trackId:1}});await vm.runInContext('chain',context);const result=messages.at(-1);assert.ok(result);assert.equal(result.error,undefined);return result;}};
}
test('a pump crossing the cue start requests drawing even if its timer never fires',async()=>{
 const w=worker();w.advanceTo(10);await w.rpc('render',.01);w.advanceTo(410);await w.rpc('pump',.41);
 w.advanceTo(500);assert.equal(w.messages.some(m=>m.type==='subtitleDeadline'),false);
 assert.equal((await w.rpc('pump',.5)).timingChanged,true);
 assert.equal((await w.rpc('pump',.6)).timingChanged,false,'one invalidation per crossed boundary');
 await w.rpc('render',.6);
 assert.equal((await w.rpc('pump',.7)).timingChanged,false,'static cue does not render each pump');
});
test('cue end is recovered when its deadline is cancelled too',async()=>{
 const w=worker();await w.rpc('render',35.7);await w.rpc('pump',35.75);
 assert.equal((await w.rpc('pump',35.8)).timingChanged,true);
 await w.rpc('render',35.8);
 assert.equal((await w.rpc('pump',35.9)).timingChanged,false);
});
test('render immediately before a cue retains the boundary despite timer look-ahead',async()=>{
 const w=worker();await w.rpc('render',.4998);
 assert.equal((await w.rpc('pump',.51)).timingChanged,true);
});
test('a delivered deadline followed by a render does not cause duplicate pump drawing',async()=>{
 const w=worker();w.advanceTo(410);await w.rpc('render',.41);
 assert.equal(w.timers.size,1);w.advanceTo(520);
 assert.equal(w.messages.filter(m=>m.type==='subtitleDeadline').length,1);
 assert.equal(w.messages.at(-1).target,.5);
 await w.rpc('render',.52);
 assert.equal((await w.rpc('pump',.6)).timingChanged,false);
});
for(const type of ['seek','select'])test(`${type} clears the old timeline boundary`,async()=>{
 const w=worker();await w.rpc('render',.01);await w.rpc(type,.6);
 assert.equal((await w.rpc('pump',.7)).timingChanged,false);
});

test('automatic backward clock recovery redraws even with an unchanged timing epoch',async()=>{
 const w=worker();await w.rpc('render',.8);await w.rpc('pump',.9);
 assert.equal((await w.rpc('pump',.1)).timingChanged,true);
});
test('automatic forward clock recovery redraws even without a future boundary',async()=>{
 const w=worker();await w.rpc('render',36);await w.rpc('pump',36.1);
 assert.equal((await w.rpc('pump',38)).timingChanged,true);
});
test('the first pump detects decoded timing changes since the last render',async()=>{
 const w=worker();await w.rpc('render',.01);w.setEpoch(8);
 assert.equal((await w.rpc('pump',.1)).timingChanged,true);
});

test('pause cancellation suppresses wakeups and resume still recovers a crossed boundary',async()=>{
 const w=worker();await w.rpc('render',.01);await w.rpc('cancelDeadline');
 w.advanceTo(1000);assert.equal(w.messages.some(m=>m.type==='subtitleDeadline'),false);
 assert.equal((await w.rpc('pump',.6)).timingChanged,true);
});

test('ASS profile is read-only and normal decoding can qualify complete timing',async()=>{
 const w=worker({ass:true});
 assert.equal((await w.rpc('profile')).mode,'fallback');
 assert.equal(w.calls.seeks,0);assert.equal(w.calls.updates,0);
 assert.equal((await w.rpc('render',0)).mode,'fallback');
 w.setEOF();assert.equal((await w.rpc('render',.1)).mode,'deadline');
});
test('EOF after a partial seek or track switch cannot qualify a complete ASS timeline',async()=>{
 const w=worker({ass:true});
 await w.rpc('seek',20);w.setEOF();
 assert.equal((await w.rpc('render',20)).mode,'fallback');
 assert.equal(w.calls.completionChecks,0);
 await w.rpc('select');w.setEOF();
 assert.equal((await w.rpc('profile')).mode,'fallback');
 await w.rpc('seek',0);w.setEOF();
 assert.equal((await w.rpc('render',0)).mode,'deadline');
});
