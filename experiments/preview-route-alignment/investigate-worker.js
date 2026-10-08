// SPDX-License-Identifier: Apache-2.0
// Independent duration-map race probe; no Demuxe or Wasm code is loaded.
self.onmessage=async({data:{duration,count=4000}})=>{
 let encoder,decoder;const result={duration,count,outputs:0,errors:[]};
 try{
  let data,config;
  encoder=new VideoEncoder({output:(chunk,metadata)=>{data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);config=metadata.decoderConfig??config;},error:e=>result.errors.push(String(e))});
  encoder.configure({codec:'avc1.42001E',width:64,height:64,bitrate:100000,framerate:30,avc:{format:'annexb'}});
  const canvas=new OffscreenCanvas(64,64);canvas.getContext('2d').fillRect(0,0,64,64);
  const frame=new VideoFrame(canvas,{timestamp:0});encoder.encode(frame,{keyFrame:true});frame.close();await encoder.flush();encoder.close();
  decoder=new VideoDecoder({output:frame=>{result.outputs++;frame.close();},error:e=>result.errors.push(String(e))});decoder.configure(config);
  for(let i=0;i<count;i++){
   decoder.decode(new EncodedVideoChunk({type:'key',timestamp:i*33333,...duration?{duration:33333}:{},data}));
   while(decoder.decodeQueueSize>32)await new Promise(r=>setTimeout(r,0));
  }
  await decoder.flush();result.status=result.outputs===count&&result.errors.length===0?'pass':'fail';
 }catch(e){result.status='fail';result.failure=String(e.stack??e);}
 finally{if(encoder?.state!=='closed')encoder?.close();if(decoder?.state!=='closed')decoder?.close();}
 self.postMessage(result);
};
