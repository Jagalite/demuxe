// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrivatePlaybackHost} from '../web/private-mpv/playback-host.js';
for(const stage of ['before','web_event','web_render'])test('decoder mailbox failure at '+stage+' fails before presenting stale output',async()=>{
 const decoder={error:stage==='before'?'frame budget':undefined};let presented=false;
 const engine={decoder,source:{drainFailures:()=>[]},call:async name=>{if(name===stage)decoder.error='frame budget';return 0;}};
 const host=new PrivatePlaybackHost(engine,{getContext:()=>({})},320,180,{retained:{present(){presented=true;}}});
 await assert.rejects(host.pump(),/Retained decoder: frame budget/);assert.equal(presented,false);
});
test('RGB presentation reuses owned pixels, reacquires grown memory, and resizes', async () => {
  let allocations=0;const previous=globalThis.ImageData;
  globalThis.ImageData=class {constructor(width,height){this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);allocations++;}};
  try {
    const memory=new WebAssembly.Memory({initial:1,maximum:2}), pictures=[];
    const context={putImageData(image){pictures.push(image.data.slice());}};
    const engine={raw:{memory},source:{generation:1,drainFailures:()=>[]},call:async name=>name==='web_render'?1024:0};
    const host=new PrivatePlaybackHost(engine,{getContext:()=>context},4,4);
    new Uint8Array(memory.buffer,1024,64).fill(17);await host.pump();
    new Uint8Array(memory.buffer,1024,64).fill(29);await host.pump();
    assert.equal(allocations,1);assert.equal(pictures[0][0],17);assert.equal(pictures[1][0],29);assert.equal(pictures[1][3],255);
    memory.grow(1);new Uint8Array(memory.buffer,1024,64).fill(41);await host.pump();
    assert.equal(allocations,1);assert.equal(pictures[2][0],41);
    host.width=2;host.height=2;await host.pump();assert.equal(allocations,2);assert.equal(pictures[3].length,16);
  } finally {globalThis.ImageData=previous;}
});

test('bounded native duration permits a rewind without assuming GOP length',async()=>{
 const host=new PrivatePlaybackHost({}, {getContext:()=>({})},320,180),commands=[];
 host.command=async(id,...args)=>commands.push({id,args});host.properties.duration=12;
 await host.seek(1,9.5);assert.deepEqual(commands[0].args,['set','hr-seek-demuxer-offset','10.5']);assert.deepEqual(commands[1].args,['seek','9.5','absolute+exact']);
 commands.length=0;host.properties.duration=120;await host.seek(2,9.5);assert.equal(commands[0].args[2],'2');
});
test('subtitle allocation failure releases earlier native strings',async()=>{
 const memory=new WebAssembly.Memory({initial:1}),freed=[];let allocations=0;
 const host=new PrivatePlaybackHost({raw:{memory},call:async(name,...args)=>{
  if(name==='malloc')return ++allocations===2?0:256;
  if(name==='free')freed.push(args[0]);else if(name==='web_add_subtitle')throw Error('Must not submit incomplete arguments');
 }},{getContext:()=>({})},320,180);
 await assert.rejects(host.addSubtitle(1,'/subtitles/0','Example','en',true),/allocation failed/);
 assert.deepEqual(freed,[256]);
});

test('paused presentation gate drains native replies while holding the snapshot canvas',async()=>{
 const calls=[],events=[JSON.stringify({event:'command-reply',id:7,result:true})];let frames=0;
 const engine={raw:{memory:{buffer:new ArrayBuffer(32)}},source:{drainFailures:()=>[]},module:{UTF8ToString:()=>events.shift()},call:async name=>{calls.push(name);if(name==='web_event')return events.length?1:0;if(name==='web_render')frames++;return 0;}};
 const host=new PrivatePlaybackHost(engine,{getContext:()=>({})},4,4);
 const result=await host.pump(false,false);assert.equal(result[0].id,7);assert.equal(calls.includes('web_render'),false);assert.equal(frames,0);assert.equal(host.draws,0);
 await host.pump(false,true);assert.equal(frames,1);
});
