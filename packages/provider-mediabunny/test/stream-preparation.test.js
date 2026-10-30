// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMP4StreamProducer} from '../stream-preparation.js';
const join=parts=>new Uint8Array(Buffer.concat(parts.map(part=>Buffer.from(part))));
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const box=(type,...parts)=>{const body=join(parts);return join([u32(body.length+8),new TextEncoder().encode(type),body]);};
const full=(type,...parts)=>box(type,u32(0),...parts);
function tableFixture(){
 const description=new Uint8Array(78);description[7]=1;
 const samples=box('stbl',full('stsd',u32(1),box('avc1',description,box('avcC',new Uint8Array([1,66,0,31])))),full('stts',u32(1),u32(2),u32(100)),full('stsz',u32(4),u32(2)),full('ctts',u32(1),u32(2),u32(0)),full('stss',u32(1),u32(1)));
 const ref=box('dinf',full('dref',u32(1),box('url ',u32(1))));
 const track=box('trak',full('tkhd',u32(0),u32(0),u32(1),u32(0),u32(200)),box('edts',full('elst',u32(1),u32(200),u32(0),u32(65536))),box('mdia',full('mdhd',u32(0),u32(0),u32(1000),u32(200)),box('minf',ref,samples)));
 return new Blob([join([box('ftyp',new TextEncoder().encode('isom'),u32(0)),box('moov',full('mvhd',u32(0),u32(0),u32(1000),u32(200)),track)])]);
}
const tracks=[{id:'v',type:'video',codec:'h264'}];
const runtime=Input=>({Input,MP4:{},QTFF:{},BlobSource:class {}});
test('stream acquisition preserves primary parser error when disposal also fails',async()=>{
 const primary=Object.assign(Error('Source permission denied'),{code:'SOURCE_PERMISSION'});let disposed=0;
 class Input {async getTracks(){throw primary;} dispose(){disposed++;throw Error('dispose failed');}}
 await assert.rejects(createMP4StreamProducer(runtime(Input),tableFixture(),{sourceTracks:tracks}),error=>error===primary);assert.equal(disposed,1);
});
test('stream acquisition cancellation settles despite stalled parser and throwing disposal',async()=>{
 const controller=new AbortController(),reason=new DOMException('Source retired','AbortError');let started,disposed=0;const waiting=new Promise(resolve=>{started=resolve;});
 class Input {getTracks(){started();return new Promise(()=>{});}dispose(){disposed++;throw Error('dispose failed');}}
 const pending=createMP4StreamProducer(runtime(Input),tableFixture(),{sourceTracks:tracks,signal:controller.signal});
 const observed=pending.then(()=>({resolved:true}),error=>({error}));await waiting;controller.abort(reason);
 const result=await Promise.race([observed,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),100))]);assert.equal(result.error,reason);assert.equal(disposed,1);
});
test('stream profile decline cannot conceal disposal failure',async()=>{
 const cleanup=Error('dispose failed'),mismatch=Object.assign(Error('unsupported'),{code:'PROVIDER_PROFILE_MISMATCH'});let disposed=0;
 class Input {async getTracks(){throw mismatch;}dispose(){disposed++;throw cleanup;}}
 await assert.rejects(createMP4StreamProducer(runtime(Input),tableFixture(),{sourceTracks:tracks}),error=>error===cleanup);assert.equal(disposed,1);
});

test('late parser acquisition after cancellation cannot start another phase',async()=>{
 const controller=new AbortController(),reason=new DOMException('Source retired','AbortError');let started,finish,disposed=0,configurations=0;const waiting=new Promise(resolve=>{started=resolve;});
 class Input {getTracks(){started();return new Promise(resolve=>{finish=resolve;});}dispose(){disposed++;}}
 const pending=createMP4StreamProducer(runtime(Input),tableFixture(),{sourceTracks:tracks,signal:controller.signal}),rejected=assert.rejects(pending,error=>error===reason);
 await waiting;controller.abort(reason);await rejected;finish([{id:1,type:'video',codec:'avc',getDecoderConfig(){configurations++;}}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(configurations,0);assert.equal(disposed,1);
});
