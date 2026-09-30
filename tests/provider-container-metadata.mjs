// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
const bytes=(...values)=>Buffer.from(values),uint=n=>n>255?bytes(n>>>8,n&255):bytes(n);
function element(id,data){const hex=id.toString(16);assert.equal(hex.length%2,0);assert.ok(data.length<127);return Buffer.concat([Buffer.from(hex,'hex'),bytes(0x80|data.length),data]);}
const field=(id,n)=>element(id,uint(n)),group=(id,...children)=>element(id,Buffer.concat(children));
function container(display=[]){
 const video=group(0xe0,field(0xb0,640),field(0xba,360),...display);
 const track=group(0xae,field(0xd7,1),field(0x83,1),element(0x86,Buffer.from('V_MPEG4/ISO/AVC')),video);
 const header=group(0x1a45dfa3,element(0x4282,Buffer.from('matroska')));
 return new Blob([header,group(0x18538067,group(0x1549a966),group(0x1654ae6b,track))]);
}
test('pixel dimensions without display overrides remain readable',async()=>{
 const reader=await MatroskaReader.open(container(),new AbortController().signal);
 assert.equal(reader.tracks[0].width,640);assert.equal(reader.tracks[0].height,360);
});
for(const [name,display]of [['DisplayWidth',[field(0x54b0,480)]],['DisplayHeight',[field(0x54ba,480)]],['both',[field(0x54b0,480),field(0x54ba,360)]]])test(`${name} without DisplayUnit rejects instead of changing aspect`,async()=>{
 await assert.rejects(()=>MatroskaReader.open(container(display),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH'&&/presentation metadata/.test(e.message));
});
