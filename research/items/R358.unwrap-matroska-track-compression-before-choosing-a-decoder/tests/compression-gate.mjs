// SPDX-License-Identifier: Apache-2.0
// Research-only finite, unlaced, zlib-only Matroska admission gate.
export async function validate(bytes){
 if(bytes.length>8*1024*1024)throw Error('source budget');let blocks=0,total=0,tracks=0,encodings=0;
 const vint=(p,tag=false)=>{if(p>=bytes.length)throw Error('vint bounds');let n=1;while(n<=8&&!(bytes[p]&(128>>(n-1))))n++;if(n>4||p+n>bytes.length)throw Error('vint budget');let value=tag?bytes[p]:bytes[p]&((1<<(8-n))-1);for(let i=1;i<n;i++)value=value*256+bytes[p+i];return [value,p+n];};
 const containers=new Set([0x18538067,0x1654ae6b,0xae,0x1f43b675,0xa0,0x6d80,0x6240,0x5034]);
 async function walk(start,end,depth=0){if(depth>8)throw Error('depth');for(let p=start;p<end;){const [tag,q]=vint(p,true),[size,a]=vint(q);if(a+size>end)throw Error('element bounds');const z=a+size;if(tag===0xae)tracks++;if(tag===0x6240)encodings++;
  if([0x5031,0x5032,0x5033,0x4254].includes(tag)){let x=0;if(size>4)throw Error('encoding field');for(let i=a;i<z;i++)x=x*256+bytes[i];if(x!==(tag===0x5032?1:0))throw Error('unsupported compression contract');}
  if(tag===0xa3||tag===0xa1){const [track,b]=vint(a);if(b+3>z||bytes[b+2]&6)throw Error('laced or short block');const payload=bytes.slice(b+3,z);const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate'));const reader=stream.getReader();let expanded=0;try{for(;;){const {value,done}=await reader.read();if(done)break;expanded+=value.length;total+=value.length;if(expanded>1024*1024||total>32*1024*1024){await reader.cancel();throw Error('expanded block budget');}}}finally{reader.releaseLock();}if(!expanded)throw Error('empty block');blocks++;if(blocks>10000)throw Error('block budget');}
  if(containers.has(tag))await walk(a,z,depth+1);p=z;}}
 await walk(0,bytes.length);if(!blocks||!tracks||encodings!==tracks)throw Error('all tracks must declare one zlib encoding');return {blocks,expandedBytes:total,sourceBytes:bytes.length,maxBlockBytes:1048576,maxTotalExpandedBytes:33554432};
}
