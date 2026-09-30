// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FragmentedMP4Writer} from '../build/component-candidates/provider-container/src/fmp4.js';
function boxes(bytes){
 const result=[];for(let at=0;at<bytes.length;){const view=new DataView(bytes.buffer,bytes.byteOffset+at),size=view.getUint32(0);assert.ok(size>=8&&at+size<=bytes.length);result.push({type:new TextDecoder().decode(bytes.subarray(at+4,at+8)),body:bytes.subarray(at+8,at+size)});at+=size;}return result;
}
test('Opus fragment roll mapping resolves its local description',()=>{
 const head=new Uint8Array(19);head.set(new TextEncoder().encode('OpusHead'));head[8]=1;head[9]=2;new DataView(head.buffer).setUint32(12,48000,true);
 const writer=new FragmentedMP4Writer([{id:1,codec:'Opus',timescale:48000,channels:2,config:head}]);
 for(let n=0;n<2;n++){
  const fragment=writer.fragment(1,[{data:Uint8Array.of(0xf8,0xff,0xfe),dts:n*960,pts:n*960,duration:960,key:true}]);
  const moof=boxes(fragment).find(b=>b.type==='moof');const traf=boxes(moof.body).find(b=>b.type==='traf');const children=boxes(traf.body);
  const sgpd=children.find(b=>b.type==='sgpd').body,sbgp=children.find(b=>b.type==='sbgp').body;
  assert.equal(new TextDecoder().decode(sbgp.subarray(4,8)),'roll');
  const mapping=new DataView(sbgp.buffer,sbgp.byteOffset),index=mapping.getUint32(16);
  assert.ok(index>0x10000,'fragment-local group must not reference stbl');
  const descriptions=new DataView(sgpd.buffer,sgpd.byteOffset);assert.equal(index-0x10000,1);assert.equal(descriptions.getUint32(12),1);assert.equal(descriptions.getInt16(16),-32);
  assert.equal(mapping.getUint32(12),1);
 }
});
