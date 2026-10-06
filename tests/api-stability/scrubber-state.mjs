// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewPNG} from '../helpers/preview-image.mjs';
import {initialScrubber,transitionScrubber,scrubberDistance,scrubberPointer} from '../../web/generated/internal/machine/scrubber.js';
import {ScrubberPreview} from '../../web/generated/player/preview.js';
const step=transitionScrubber;
const cache=(state,time,hit=false,refine=false,hover=state.hover)=>step(state,{type:'cache',hover,target:{owner:1,time},hit,refine});

test('continuous hover keeps one generation lane and only the newest waiting target',()=>{
 let state=step(initialScrubber(),{type:'hover'}).state;
 const first=step(cache(state,1).state,{type:'generate'});state=first.state;
 for(const time of [2,3,4,5]){state=step(state,{type:'hover'}).state;state=cache(state,time).state;assert.equal(step(state,{type:'generate'}).accepted,false);}
 assert.equal(state.pending.time,5);assert.equal(state.generation.time,1);
 assert.equal(step(state,{type:'generated',id:first.generate.id,aborted:false,hasFrame:true}).show,true);
 state=step(state,{type:'generation-finished',id:first.generate.id}).state;const next=step(state,{type:'generate'});
 assert.equal(next.generate.time,5);assert.equal(next.state.pending,null);assert.ok(next.generate.id>first.generate.id);
});

test('cache hits bypass old decode publication without cancelling its occupied lane',()=>{
 const first=step(cache(initialScrubber(),1).state,{type:'generate'});let state=first.state;
 state=step(state,{type:'hover'}).state;const resident=cache(state,7,true);state=resident.state;
 assert.equal(resident.show,true);assert.equal(resident.abortGeneration,undefined);assert.equal(state.generation.id,first.generate.id);
 assert.equal(step(state,{type:'generated',id:first.generate.id,aborted:false,hasFrame:true}).accepted,false);
 state=step(state,{type:'generation-finished',id:first.generate.id}).state;assert.equal(step(state,{type:'generate'}).accepted,false);
});

test('far adaptive cache hit presents immediately and queues exactly one refinement',()=>{
 const cached=cache(initialScrubber(),100,true,true);assert.equal(cached.show,true);assert.equal(cached.state.pending.time,100);
 const generation=step(cached.state,{type:'generate'});assert.equal(generation.generate.time,100);assert.equal(step(generation.state,{type:'generate'}).accepted,false);
 assert.equal(scrubberDistance({type:'adaptive',samples:24,every:5},7200),151);assert.equal(scrubberDistance({type:'adaptive',samples:24,every:5},7200,true),3.5);
 assert.equal(scrubberDistance({type:'interval',every:2,unit:'minutes'},100),61);assert.equal(scrubberDistance({type:'on-demand'},100),1);assert.equal(scrubberDistance(null,960),11);
});

test('only latest hover can install cache outcomes across leave, reenter and source retirement',()=>{
 let state=step(initialScrubber(),{type:'hover'}).state;const old=state.hover;
 state=step(state,{type:'hide'}).state;state=step(state,{type:'hover'}).state;
 assert.equal(cache(state,20,true,false,old).accepted,false);assert.equal(state.pending,null);
 assert.equal(cache(state,30,false,false,state.hover).accepted,true);
 const destroyed=step(state,{type:'destroy'}).state;
 for(const command of [{type:'hover'},{type:'generate'},{type:'cache',hover:destroyed.hover,target:{owner:1,time:4},hit:true,refine:false},{type:'show',image:1}])assert.equal(step(destroyed,command).accepted,false);
});

test('same-image requests reuse loading; new image retires presentation and stale deadlines cannot clear it',()=>{
 const initial=initialScrubber(),first=step(initial,{type:'show',image:1});assert.equal(first.presentation.needsImage,true);
 assert.equal(step(first.state,{type:'show',image:1}).accepted,false);
 const second=step(first.state,{type:'show',image:2});assert.equal(second.abortPresentation,first.presentation.id);
 for(const type of ['decoded','presented','presentation-finished','presentation-failed','deadline'])assert.equal(step(second.state,{type,id:first.presentation.id}).state,second.state);
 let state=step(second.state,{type:'decoded',id:second.presentation.id}).state;state=step(state,{type:'presented',id:second.presentation.id}).state;state=step(state,{type:'presentation-finished',id:second.presentation.id}).state;
 assert.equal(state.visible,true);assert.equal(step(state,{type:'show',image:2}).presentation.needsImage,false);assert.equal(initial.displayedImage,null);
});

test('every hide ordering retires generation and presentation without releasing replacement lanes',()=>{
 for(const completion of ['generated','generation-finished','decoded','presented','presentation-finished','deadline']){
  const generation=step(cache(initialScrubber(),2).state,{type:'generate'}),image=step(generation.state,{type:'show',image:1}),hidden=step(image.state,{type:'hide'});
  assert.equal(hidden.abortGeneration,generation.generate.id);assert.equal(hidden.abortPresentation,image.presentation.id);assert.equal(hidden.state.visible,false);assert.equal(hidden.state.pending,null);
  const freshGeneration=step(cache(hidden.state,5).state,{type:'generate'}),freshImage=step(freshGeneration.state,{type:'show',image:2});
  const stale=step(freshImage.state,{type:completion,id:completion.startsWith('generat')?generation.generate.id:image.presentation.id,aborted:false,hasFrame:true});
  assert.equal(stale.state,freshImage.state);
 }
});

test('pointer geometry clamps preview time and panel edges and rejects disabled/touch/empty ranges',()=>{
 const facts={touch:false,disabled:false,left:10,width:100,min:5,max:15,x:200,parentLeft:0,parentWidth:500};
 assert.deepEqual(scrubberPointer(facts),{hide:false,time:15,left:200});assert.equal(scrubberPointer({...facts,x:-50}).time,5);assert.equal(scrubberPointer({...facts,x:-50}).left,120);
 assert.deepEqual(scrubberPointer({...facts,touch:true}),{hide:true});assert.deepEqual(scrubberPointer({...facts,disabled:true}),{hide:true});assert.deepEqual(scrubberPointer({...facts,width:0}),{hide:false});
 assert.equal(scrubberPointer({...facts,parentWidth:100}).left,50);
});

test('pointer time follows the native thumb travel and range step on long and live timelines',()=>{
 const facts={touch:false,disabled:false,left:94,width:1214,thumbWidth:12,step:.1,min:0,max:1800,x:94+1214*130/1800,parentLeft:0,parentWidth:1402};
 assert.equal(scrubberPointer(facts).time,122.3); // Previously advertised 2:10 at this position.
 assert.equal(scrubberPointer({...facts,x:100+1202*130/1800}).time,130);
 assert.equal(scrubberPointer({...facts,x:94}).time,0);
 assert.equal(scrubberPointer({...facts,x:1308}).time,1800);
 assert.equal(scrubberPointer({...facts,min:1000,max:2800,x:100+1202*130/1800}).time,1130);
 assert.equal(scrubberPointer({...facts,max:12.032,x:1308}).time,12);
 assert.deepEqual(scrubberPointer({...facts,width:12}),{hide:false});
});

function shellFixture(decode=async()=>{}){
 const timeline=new EventTarget();timeline.min='0';timeline.max='100';const panel={hidden:true},image={hidden:true,removeAttribute(){delete this.src;},ownerDocument:{createElement(){return {decode,removeAttribute(){delete this.src;}};}}},label={textContent:''};
 return {preview:new ScrubberPreview(timeline,panel,image,label,()=>undefined),timeline,panel,image,label};
}
const frame=()=>({time:3,actualTime:3,width:1,height:1,temporalAccuracy:'exact',image:{blob:new Blob([previewPNG()],{type:'image/png'})}});

test('shell URL cleanup remains exact after abort followed by late image decode',async t=>{
 let finish;const revoked=[];t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));const f=shellFixture(()=>new Promise(resolve=>finish=resolve));
 const pending=f.preview.show(frame('old'));await new Promise(setImmediate);f.preview.hide();assert.equal(revoked.length,1);finish();await pending;assert.equal(revoked.length,1);assert.equal(f.panel.hidden,true);f.preview.destroy();assert.equal(revoked.length,1);
});

test('shell revokes an acquired URL if image element construction fails',async t=>{
 const revoked=[];t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));const f=shellFixture();f.image.ownerDocument.createElement=()=>{throw Error('Cannot create image');};
 await f.preview.show(frame('failed'));assert.equal(revoked.length,1);assert.equal(f.panel.hidden,true);f.preview.destroy();assert.equal(revoked.length,1);
});
