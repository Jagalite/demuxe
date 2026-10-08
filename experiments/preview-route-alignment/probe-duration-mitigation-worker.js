// SPDX-License-Identifier: Apache-2.0
import {WebCodecsVideoDecoder,externalFrameDuration} from '/web/external-video-decoder.js';
self.onmessage=async({data:{duration,count=4000}})=>{
 const result={duration,count,outputs:0,errors:[],rawDurationFields:0,restoredDurations:0};let encoder,decoder;
 try{
  let bytes,configuration;
  encoder=new VideoEncoder({output:(chunk,metadata)=>{bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);configuration=metadata.decoderConfig??configuration;},error:e=>result.errors.push(String(e))});
  encoder.configure({codec:'avc1.42001E',width:64,height:64,bitrate:100000,framerate:30,avc:{format:'annexb'}});
  const canvas=new OffscreenCanvas(64,64);canvas.getContext('2d').fillRect(0,0,64,64);const frame=new VideoFrame(canvas,{timestamp:0});encoder.encode(frame,{keyFrame:true});frame.close();await encoder.flush();encoder.close();
  class ObservedDecoder{
   constructor(callbacks){this.raw=new VideoDecoder(callbacks);}get state(){return this.raw.state;}get decodeQueueSize(){return this.raw.decodeQueueSize;}
   configure(c){this.raw.configure(c);}addEventListener(...a){this.raw.addEventListener(...a);}flush(){return this.raw.flush();}close(){this.raw.close();}
   decode(chunk){if(chunk.duration!==null)result.rawDurationFields++;this.raw.decode(chunk);}
  }
  decoder=new WebCodecsVideoDecoder({Decoder:ObservedDecoder,output:frame=>{result.outputs++;if(duration){if(externalFrameDuration(frame)===33333+((result.outputs-1)*33334)%3&&Math.abs(frame.timestamp-(result.outputs-1)*33334)<=1)result.restoredDurations++;else result.errors.push('Wrong output duration');}frame.close();},error:e=>result.errors.push(String(e))});
  result.workaround=decoder.durationWorkaround;decoder.configure(configuration);
  for(let i=0;i<count;i++){const chunk=new EncodedVideoChunk({type:'key',timestamp:i*33334,...duration?{duration:33333+(i*33334)%3}:{},data:bytes});while(!decoder.submit(chunk))await new Promise(r=>setTimeout(r,0));}
  await decoder.drain();result.metadataRemaining=decoder.durations.get(decoder.machine.current.id).length;
  result.status=result.outputs===count&&result.errors.length===0&&result.metadataRemaining===0&&(!result.workaround||result.rawDurationFields===0)&&(!duration||result.restoredDurations===count)?'pass':'fail';
 }catch(e){result.status='fail';result.failure=String(e.stack??e);}finally{if(encoder?.state!=='closed')encoder?.close();decoder?.destroy();}
 self.postMessage(result);
};
