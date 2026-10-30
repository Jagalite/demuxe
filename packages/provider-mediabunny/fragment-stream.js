// SPDX-License-Identifier: Apache-2.0
/** Incremental fMP4 box framing and one-record handoff. This owns producer
 * buffers only; the existing presentation owner owns append queues and MSE. */
export function createFragmentStream({maxInitializationBytes=1024*1024,maxFragmentBytes=8*1024*1024}={}) {
  for(const limit of [maxInitializationBytes,maxFragmentBytes])if(!Number.isSafeInteger(limit)||limit<32)throw new TypeError('Invalid fragment budget');
  let position=0,header=new Uint8Array(16),headerLength=0,headerNeeded=8,box,boxAt=0,type;
  let parts=[],partBytes=0,phase='ftyp',queued,waiting,produced,ended=false,failed=false,failure;
  let peakOwnedBytes=0,initializations=0,fragments=0,totalBytes=0;
  const check=()=>{if(failed)throw failure;if(ended)throw new Error('Fragment stream is closed');};
  const owned=()=>partBytes+(box?.byteLength??0)+(queued?.bytes.byteLength??0)+16;
  const measure=(extra=0)=>{peakOwnedBytes=Math.max(peakOwnedBytes,owned()+extra);};
  const abort=error=>{
    if(failed||ended)return;failed=true;failure=error;
    parts=[];partBytes=0;box=undefined;queued=undefined;
    const consumer=waiting,producer=produced;waiting=produced=undefined;
    consumer?.reject(error);producer?.reject(error);
  };
  const publish=async kind=>{
    measure(partBytes);
    const bytes=new Uint8Array(partBytes);let at=0;
    for(const part of parts){bytes.set(part,at);at+=part.length;}
    parts=[];partBytes=0;
    if(kind==='initialization')initializations++;else fragments++;
    const value={kind,bytes};
    if(waiting){const consumer=waiting;waiting=undefined;consumer.resolve({done:false,value});return;}
    queued=value;measure();
    await new Promise((resolve,reject)=>{produced={resolve,reject};});
    check();
  };
  const completeBox=async()=>{
    let completed=box;box=undefined;boxAt=0;headerLength=0;headerNeeded=8;
    if(type==='ftyp'&&phase==='ftyp'){parts.push(completed);partBytes+=completed.length;phase='moov';}
    else if(type==='moov'&&phase==='moov'){
      parts.push(completed);partBytes+=completed.length;completed=undefined;phase='moof';
      await publish('initialization');
    }else if(type==='moof'&&phase==='moof'){parts.push(completed);partBytes+=completed.length;phase='mdat';}
    else if(type==='mdat'&&phase==='mdat'){
      parts.push(completed);partBytes+=completed.length;completed=undefined;phase='moof';
      await publish('fragment');
    }else if(type==='mfra'&&phase==='moof'){/* Final random-access index is not appended to MSE. */}
    else throw new Error('Unexpected fragmented MP4 box order');
    measure();
  };
  const writable=new WritableStream({
    async write(chunk){
      try{
      check();
      if(!(chunk?.data instanceof Uint8Array)||chunk.position!==position)throw new Error('Fragment output must be contiguous and monotonic');
      const data=chunk.data;position+=data.length;totalBytes+=data.length;
        for(let at=0;at<data.length;){
          check();
          if(!box){
            const n=Math.min(headerNeeded-headerLength,data.length-at);
            header.set(data.subarray(at,at+n),headerLength);headerLength+=n;at+=n;
            if(headerLength<headerNeeded)continue;
            const view=new DataView(header.buffer);
            if(headerNeeded===8&&view.getUint32(0)===1){headerNeeded=16;continue;}
            const size=headerNeeded===16?Number(view.getBigUint64(8)):view.getUint32(0);
            type=String.fromCharCode(...header.subarray(4,8));
            const limit=phase==='ftyp'||phase==='moov'?maxInitializationBytes:maxFragmentBytes;
            if(!Number.isSafeInteger(size)||size<headerNeeded||size>limit-partBytes||!['ftyp','moov','moof','mdat','mfra'].includes(type))throw new RangeError('Fragment output exceeds its finite box profile');
            box=new Uint8Array(size);box.set(header.subarray(0,headerNeeded));boxAt=headerNeeded;measure();
          }
          const n=Math.min(box.length-boxAt,data.length-at);
          box.set(data.subarray(at,at+n),boxAt);boxAt+=n;at+=n;
          if(boxAt===box.length)await completeBox();
        }
      }catch(error){abort(error);throw error;}
    },
    close(){
      try{
      check();
      if(headerLength||box||parts.length||phase!=='moof')throw new Error('Incomplete fragmented MP4 output');
      ended=true;const consumer=waiting;waiting=undefined;consumer?.resolve({done:true,value:undefined});
      }catch(error){abort(error);throw error;}
    },
    abort,
  },{highWaterMark:1});
  return {
    writable,abort,
    get stats(){return Object.freeze({retainedBytes:owned(),peakOwnedBytes,initializations,fragments,totalBytes,queuedRecords:queued?1:0});},
    next(){
      if(failed)return Promise.reject(failure);
      if(queued){const value=queued;queued=undefined;const producer=produced;produced=undefined;producer.resolve();return Promise.resolve({done:false,value});}
      if(ended)return Promise.resolve({done:true,value:undefined});
      if(waiting)return Promise.reject(new Error('Only one fragment pull may be pending'));
      return new Promise((resolve,reject)=>{waiting={resolve,reject};});
    },
    [Symbol.asyncIterator](){return this;},
  };
}
