// Exercise the actual worker's ownership functions with injected frames/timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {StreamingController}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/streaming-controller.js')).href:'./files/web/streaming-controller.js');
const file=process.env.RETAINED_WORKER;
if(!file)throw Error('Set RETAINED_WORKER to the exact worker source under test');
const source=readFileSync(file,'utf8').split('let decoderWorker,decoderStats;')[0].replace(/^import .*;$/mg,'');
function setup(t){
 const timers=new Map();let serial=0;
 const c=vm.createContext({URL,performance,StreamingController,self:{location:{href:'https://player.example/?mode=retained'}},
  setTimeout:fn=>{timers.set(++serial,fn);return serial},clearTimeout:id=>timers.delete(id),
  SubtitleOverlay:class {clears=0;clear(){this.clears++}draw(){}},drawRetainedVideo:()=>{}});
 vm.runInContext(source+`\nconst qualityAcks=[];let ioSession=7;let engine={_web_presented(){},ccall(name,result,types,args){if(name==='web_quality_presented')qualityAcks.push(args);}},pendingTarget=null;const context={},canvas={};function tick(){};
 function frame(pts){return {timestamp:pts,closes:0,close(){if(++this.closes>1)throw Error('double close');}};}`,c);
 t.after(()=>vm.runInContext('cleanupFrames()',c));
 return {run:s=>vm.runInContext(s,c),timers};
}
test('decoder reconfiguration preserves an old frame already scheduled by mpv',t=>{
 const {run,timers}=setup(t);
 run(`globalThis.old=frame(1000000);receiveFrame({pts:1000000,generation:1,retainedFrame:old});subtitles.clears=0;
 pendingFrames.set(1000000,{overlay:{},quality:{source:7,request:1,representation:3},deadline:performance.now()+500,scheduled:false});presentReady(1000000);
 globalThis.next=frame(1041667);receiveFrame({pts:1041667,generation:2,retainedFrame:next});`);
 assert.equal(run('frames.has(1000000)'),true,'Decoder advance must not discard scheduled output');
 assert.equal(run('old.closes'),0);assert.equal(run('subtitles.clears'),0,'Video configuration does not own subtitle lifetime');
 for(const fn of timers.values())fn();timers.clear();
 assert.equal(run('heldFrame===old'),true);assert.equal(run('presentation.drawn'),1);
 assert.equal(run('JSON.stringify(qualityAcks)'),JSON.stringify([[7,1,3]]),'The drawn old frame keeps its original quality identity');
});
test('source or seek retirement still rejects stale decoder generations',t=>{
 const {run}=setup(t);
 run(`globalThis.old=frame(1000000);receiveFrame({pts:1000000,generation:2,retainedFrame:old});cleanupFrames();closingFrames=false;minGeneration=3;
 globalThis.stale=frame(2000000);receiveFrame({pts:2000000,generation:2,retainedFrame:stale});
 globalThis.fresh=frame(2000000);receiveFrame({pts:2000000,generation:3,retainedFrame:fresh});`);
 assert.equal(run('old.closes'),1);assert.equal(run('stale.closes'),1);assert.equal(run('fresh.closes'),0);assert.equal(run('frames.size'),1);
});

test('unidentified output clears presented quality without attributing a request',t=>{
 const {run}=setup(t);run('acknowledgeQuality({source:0,request:0,representation:0})');
 assert.equal(run('JSON.stringify(qualityAcks)'),JSON.stringify([[7,-1,0]]));
});

test('redrawing a held frame cannot relabel it with another selection at the same PTS',t=>{
 const {run}=setup(t);
 run(`globalThis.old=frame(1000000);receiveFrame({pts:1000000,generation:1,retainedFrame:old});
 pendingFrames.set(1000000,{overlay:{},quality:{source:7,request:1,representation:3},deadline:0,scheduled:false});presentReady(1000000);
 engine._web_selected_serial=()=>2;engine._web_selected_pts=()=>1;engine._web_selected_redraw=()=>true;
 subtitles.read=()=>({});const originalCall=engine.ccall;
 engine.ccall=(name,...args)=>name==='web_quality_selected'?JSON.stringify({source:7,request:2,representation:4}):originalCall(name,...args);
 presentSelected();`);
 assert.equal(run('presentation.redraws'),1);
 assert.equal(run('JSON.stringify(qualityAcks)'),JSON.stringify([[7,1,3],[7,1,3]]));
});

if(source.includes('function resetPresentation')){
 for(const order of ['selection-first','frame-first'])test('internal paused seek draws its single new frame: '+order,t=>{
  const {run}=setup(t);
  run(`subtitles.read=()=>({});engine._web_selected_delay=()=>0;engine._web_selected_redraw=()=>false;
   let selectedPts=8,selectedSequence=1,selectedGeneration=1;engine._web_selected_serial=()=>selectedSequence;engine._web_selected_pts=()=>selectedPts;
   const call=engine.ccall;engine.ccall=(name,...args)=>name==='web_quality_selected'?JSON.stringify({generation:selectedGeneration}):call(name,...args);
   globalThis.old=frame(8000000);receiveFrame({pts:8000000,generation:1,retainedFrame:old});presentSelected();
   resetPresentation(2);presentSelected();
   globalThis.fresh=frame(3000000);`);
  assert.equal(run('pendingFrames.size'),0,'Old VO selection must not wait for a retired frame');
  if(order==='selection-first')run('selectedPts=3;selectedGeneration=2;selectedSequence++;presentSelected();');
  run('receiveFrame({pts:3000000,generation:2,retainedFrame:fresh});');
  if(order==='frame-first')run('selectedPts=3;selectedGeneration=2;selectedSequence++;presentSelected();');
  assert.equal(run('heldFrame===fresh'),true);assert.equal(run('old.closes'),1);assert.equal(run('pendingFrames.size'),0);
  assert.equal(run('presentation.position'),3);assert.equal(run('presentation.drawn'),2);
 });
}

if(source.includes('presentationFloor'))test('identical PTS cannot let old native selection present a new reset generation',t=>{
 const {run}=setup(t);
 run(`subtitles.read=()=>({});engine._web_selected_delay=()=>0;engine._web_selected_redraw=()=>false;
  let selectedGeneration=1,sequence=1;engine._web_selected_serial=()=>sequence;engine._web_selected_pts=()=>3;
  const call=engine.ccall;engine.ccall=(name,...args)=>name==='web_quality_selected'?JSON.stringify({generation:selectedGeneration}):call(name,...args);
  resetPresentation(2);globalThis.fresh=frame(3000000);receiveFrame({pts:3000000,generation:2,retainedFrame:fresh});presentSelected();`);
 assert.equal(run('presentation.drawn'),0,'The new frame is not yet selected by mpv');
 run('selectedGeneration=2;sequence++;presentSelected();');
 assert.equal(run('heldFrame===fresh'),true);assert.equal(run('presentation.drawn'),1);
});


test('late decoder reset retires explicit seek preroll after its waiter completes',t=>{
 const {run}=setup(t);
 run(`subtitles.read=()=>({});engine._web_selected_delay=()=>0;engine._web_selected_redraw=()=>false;
  let selectedGeneration=4,sequence=3;engine._web_selected_serial=()=>sequence;engine._web_selected_pts=()=>18;
  const call=engine.ccall;engine.ccall=(name,...args)=>name==='web_quality_selected'?JSON.stringify({generation:selectedGeneration}):call(name,...args);
  seekFrameFloor=17850000;pendingTarget=null;resetPresentation(7);
  globalThis.preroll=[];
  for(let i=0;i<44;i++){const pts=16000000+i*41667,f=frame(pts);preroll.push(f);receiveFrame({pts,generation:7,retainedFrame:f});}
 `);
 assert.equal(run('frames.size'),0);assert.equal(run('preroll.every(f=>f.closes===1)'),true);
 assert.equal(run('presentation.drawn'),0);
 run('globalThis.target=frame(18000000);receiveFrame({pts:18000000,generation:7,retainedFrame:target});');
 assert.equal(run('presentation.drawn'),0,'Old native generation must not select new output');
 run('selectedGeneration=7;sequence++;presentSelected();');
 assert.equal(run('heldFrame===target'),true);assert.equal(run('presentation.drawn'),1);
 assert.ok(run('presentation.peakRetained')<=1);
});
