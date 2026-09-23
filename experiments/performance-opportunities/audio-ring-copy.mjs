// SPDX-License-Identifier: Apache-2.0
// Isolated copy-stage probe. It does not change a player or estimate whole-player CPU.
import assert from 'node:assert/strict';

const capacity=8192, frames=48000, rounds=40;
const now=()=>process.hrtime.bigint();
function current(source,target,start,count,channels) {
  for(let i=0;i<count;i++){
    const index=((start+i)%capacity)*channels;
    for(let c=0;c<channels;c++)target[index+c]=source[index+c];
  }
}
function bulk(source,target,start,count,channels) {
  let at=start%capacity,remaining=count;
  while(remaining){const n=Math.min(remaining,capacity-at),offset=at*channels;
    target.set(source.subarray(offset,offset+n*channels),offset);
    remaining-=n;at=0;
  }
}
function run(channels){
  const source=new Float32Array(capacity*channels),a=new Float32Array(source.length),b=new Float32Array(source.length);
  for(let i=0;i<source.length;i++)source[i]=(i%997)/997;
  for(let start=0;start<capacity;start+=257){
    a.fill(0);b.fill(0);current(source,a,start,128,channels);bulk(source,b,start,128,channels);
    assert.deepEqual(a,b);
  }
  const measure=fn=>{let total=0n;for(let r=0;r<rounds;r++){
    const t=now();for(let start=0;start<frames;start+=128)fn(source,b,start,Math.min(128,frames-start),channels);total+=now()-t;
  }return Number(total)/1e6/rounds;};
  for(let i=0;i<5;i++){measure(current);measure(bulk);}
  const currentMs=measure(current),bulkMs=measure(bulk);
  return {channels,frames,rounds,currentMs,bulkMs,ratio:currentMs/bulkMs,identity:'equal'};
}
for(const channels of [2,6,8])console.log(JSON.stringify(run(channels)));
