// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSplitMP4,splitMP4,initialMP4VideoTiming,readMP4VideoTiming} from '../../web/generated/internal/machine/split-mp4.js';
import {SplitMP4,MP4VideoTiming} from '../../web/split-mp4.js';
const u32=value=>{const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value);return bytes;};
const join=parts=>{const bytes=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;};
const text=value=>Uint8Array.from(value,letter=>letter.charCodeAt(0));
const box=(type,...parts)=>{const bytes=join(parts);return join([u32(bytes.length+8),text(type),bytes]);};
function fixture({defaults=true,videoScale=1000,edit=false}={}){
 const field=(type,length,entries)=>{const bytes=new Uint8Array(length);bytes.set(u32(length));bytes.set(text(type),4);const view=new DataView(bytes.buffer);for(const[at,value]of entries)view.setUint32(at,value);return bytes;};
 const track=(id,role,scale)=>box('trak',field('tkhd',32,[[20,id]]),...(id===1&&edit?[box('edts',box('elst',u32(0),u32(2),u32(1000),u32(-1),u32(65536),u32(0),u32(0),u32(65536)))]:[]),box('mdia',box('hdlr',u32(0),u32(0),text(role)),field('mdhd',28,[[20,scale]])));
 const init=box('moov',field('mvhd',28,[[20,1000]]),track(1,'vide',videoScale),track(2,'soun',48000),...(defaults?[box('mvex',field('trex',32,[[12,1],[20,1000],[24,3]]),field('trex',32,[[12,2],[20,4800],[24,2]]))]:[]));
 const fragment=offset=>box('moof',box('mfhd',u32(0),u32(1)),box('traf',box('tfhd',u32(0x020000),u32(1)),box('tfdt',u32(0),u32(1000)),box('trun',u32(0x01000b01),u32(2),u32(offset),u32(1000),u32(3),u32(1000),u32(1000),u32(3),u32(-1000))),box('traf',box('tfhd',u32(0x020000),u32(2)),box('tfdt',u32(0),u32(0)),box('trun',u32(0x301),u32(1),u32(offset+6),u32(4800),u32(2))));
 const media=join([fragment(fragment(0).length+8),box('mdat',Uint8Array.of(10,11,12,20,21,22,30,31))]);return{init,media};
}
const f=fixture();
const cloneInput=input=>input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength);
const stateCopy=state=>structuredClone(state);

test('split initialization commits immutable numeric identities and default sizes only',()=>{
 const state=initialSplitMP4(),before=stateCopy(state),bytes=f.init.slice(),decision=splitMP4(state,cloneInput(bytes));assert.deepEqual(state,before);assert.deepEqual(bytes,f.init);assert.deepEqual(decision.state,{ids:[1,2],defaults:[{id:1,size:3},{id:2,size:2}]});assert.ok(Object.isFrozen(decision.state.ids));assert.ok(Object.isFrozen(decision.state.defaults[0]));assert.equal(decision.buffers.length,2);for(const buffer of decision.buffers)assert.equal(Buffer.from(buffer).toString('latin1').split('trak').length-1,1);
});
test('timing initialization and signed composition offsets produce exact independent intervals',()=>{
 const state=initialMP4VideoTiming(),init=readMP4VideoTiming(state,f.init);assert.deepEqual(init.frames,[]);assert.deepEqual(init.state,{track:1,scale:1000,shift:0,defaults:[{id:1,duration:1000},{id:2,duration:4800}]});const before=stateCopy(init.state),media=readMP4VideoTiming(init.state,f.media);assert.deepEqual(media.frames,[[2,1],[1,1]]);assert.deepEqual(init.state,before);
});
test('empty movie edit followed by open media edit shifts presentation without changing durations',()=>{
 const edited=fixture({edit:true}),init=readMP4VideoTiming(initialMP4VideoTiming(),edited.init);assert.equal(init.state.shift,1);assert.deepEqual(readMP4VideoTiming(init.state,edited.media).frames,[[3,1],[2,1]]);
});
test('split malformed initialization leaves prior history available for a valid retry',()=>{
 const p=new SplitMP4(),old=p.machine;assert.throws(()=>p.split(fixture({defaults:false}).init),/Missing fragment defaults/);assert.equal(p.machine,old);assert.deepEqual(p.ids,[]);assert.equal(p.split(f.init).length,2);assert.deepEqual(p.ids,[1,2]);
});
test('timing malformed initialization cannot leave a selected track with an invalid time base',()=>{
 const p=new MP4VideoTiming(),old=p.machine;assert.throws(()=>p.read(fixture({videoScale:0}).init),/Invalid media time base/);assert.equal(p.machine,old);assert.equal(p.track,undefined);p.read(f.init);assert.deepEqual(p.read(f.media),[[2,1],[1,1]]);
});
test('reinitialization rejection and fragment-before-init preserve immutable histories',()=>{
 const split=new SplitMP4(),timing=new MP4VideoTiming();assert.throws(()=>split.split(f.media),/before track initialization/);assert.throws(()=>timing.read(f.media),/before initialization/);split.split(f.init);timing.read(f.init);const before=[split.machine,timing.machine];assert.throws(()=>split.split(f.init),/reinitialization/);assert.throws(()=>timing.read(f.init),/reinitialization/);assert.equal(split.machine,before[0]);assert.equal(timing.machine,before[1]);
});
test('whole and incremental calls preserve identical lane bytes and parser histories',()=>{
 const whole=splitMP4(initialSplitMP4(),join([f.init,f.media])),a=splitMP4(initialSplitMP4(),f.init),b=splitMP4(a.state,f.media);assert.deepEqual(b.state,whole.state);for(let lane=0;lane<2;lane++)assert.deepEqual(join([new Uint8Array(a.buffers[lane]),new Uint8Array(b.buffers[lane])]),new Uint8Array(whole.buffers[lane]));const timing=readMP4VideoTiming(initialMP4VideoTiming(),join([f.init,f.media]));assert.deepEqual(timing.frames,[[2,1],[1,1]]);
});
test('fresh caller-owned outputs never alias input bytes or later parser decisions',()=>{
 const input=join([f.init,f.media]),before=input.slice(),split=splitMP4(initialSplitMP4(),input);for(const buffer of split.buffers)new Uint8Array(buffer).fill(0);assert.deepEqual(input,before);const again=splitMP4(split.state,f.media);assert.ok(new Uint8Array(again.buffers[0]).some(value=>value!==0));const timing=readMP4VideoTiming(initialMP4VideoTiming(),input);timing.frames[0][0]=-999;assert.deepEqual(readMP4VideoTiming(timing.state,f.media).frames,[[2,1],[1,1]]);
});
test('repeated pure histories replay exactly with bounded metadata and no accumulated frames',()=>{
 let split=initialSplitMP4(),timing=initialMP4VideoTiming();const history=[f.init,...Array(50).fill(f.media)],outputs=[];for(const input of history){const before=stateCopy({split,timing}),a=splitMP4(split,input),b=readMP4VideoTiming(timing,input);assert.deepEqual({split,timing},before);split=a.state;timing=b.state;outputs.push(b.frames);assert.equal(split.ids.length,2);assert.equal(split.defaults.length,2);assert.equal(timing.defaults.length,2);assert.ok(b.frames.length<=2);}const replay=history.reduce((state,input)=>({split:splitMP4(state.split,input).state,timing:readMP4VideoTiming(state.timing,input).state}),{split:initialSplitMP4(),timing:initialMP4VideoTiming()});assert.deepEqual(replay,{split,timing});assert.equal(outputs.flat().length,100);
});
test('input and sample budgets reject before committing an existing parser history',()=>{
 const split=new SplitMP4(),timing=new MP4VideoTiming();split.split(f.init);timing.read(f.init);const previous=[split.machine,timing.machine];for(const parser of [split,timing])assert.throws(()=>parser instanceof SplitMP4?parser.split(new ArrayBuffer(8*1024*1024+1)):parser.read(new ArrayBuffer(8*1024*1024+1)),/budget/);
 const bad=f.media.slice(),trun=Buffer.from(bad).indexOf('trun');new DataView(bad.buffer).setUint32(trun+8,20001);assert.throws(()=>split.split(bad),/sample run addressing or count/);assert.throws(()=>timing.read(bad),/sample budget/);assert.equal(split.machine,previous[0]);assert.equal(timing.machine,previous[1]);
});
