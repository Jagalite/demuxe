// Experiment only. The container and packet owner changes; Demuxe's retained-frame draw stays in use.
import {Input, UrlSource, ALL_FORMATS, EncodedPacketSink, VideoSampleSink, AudioSampleSink} from './vendor/mediabunny.min.mjs';
import {WebCodecsPresenter} from '../../../web/video-presenter.js';

const now=()=>performance.now();
const safe=e=>String(e?.stack||e);
let extensionsRegistered=false;
async function registerExtensions(){
  if(extensionsRegistered)return;
  const [prores,ac3,dts]=await Promise.all([
    import('./vendor/mediabunny-prores.min.mjs'),
    import('./vendor/mediabunny-ac3.min.mjs'),
    import('./vendor/mediabunny-dts.min.mjs')]);
  prores.registerProresDecoder();ac3.registerAc3Decoder();dts.registerDtsDecoder();
  extensionsRegistered=true;
}
export async function probe(url,{decodePackets=90,seeks=[],extensions=false}={}){
  const t0=now(),network=[];
  const source=new UrlSource(url,{fetchFn:async(request,init)=>{
    const start=now(),response=await fetch(request,init);
    const range=new Headers(init?.headers??request?.headers).get('range');
    network.push({range,status:response.status,contentRange:response.headers.get('content-range'),contentLength:response.headers.get('content-length'),startMs:start-t0});
    return response;
  }});
  const input=new Input({source,formats:ALL_FORMATS});
  const result={url,measurements:{},network,tracks:[],seeks:[],video:null,audio:null,errors:[]};
  try{
    result.measurements.inputOpenMs=now()-t0;
    const tracks=await input.getTracks();result.measurements.metadataReadyMs=now()-t0;
    try{const tags=await input.getMetadataTags();
      result.attachments=Object.values(tags.raw??{}).filter(value=>value&&typeof value==='object'&&'data' in value)
        .map(value=>({name:value.name??null,mimeType:value.mimeType??null,bytes:value.data?.byteLength??null}));
    }catch(e){result.attachmentError=safe(e);}
    for(const track of tracks){
      const codec=await track.getCodec();
      const type=track.isVideoTrack()?'video':track.isAudioTrack()?'audio':track.isSubtitleTrack()?'subtitle':'unknown';
      const record={type,codec};
      if(typeof track.getDecoderConfig==='function'){
        try{const config=await track.getDecoderConfig();record.config=config?{...config,descriptionBytes:config.description?.byteLength,description:undefined}:null;
          if(type==='video')result.video={config,track};
          if(type==='audio')result.audio={config,track};
        }catch(e){record.configError=safe(e);}
      }
      result.tracks.push(record);
    }
    result.measurements.decoderConfigReadyMs=now()-t0;
    const video=result.video?.track,audio=result.audio?.track;
    const videoSink=video?new EncodedPacketSink(video):null;
    const audioSink=audio?new EncodedPacketSink(audio):null;
    const first=videoSink?await videoSink.getFirstPacket():audioSink?await audioSink.getFirstPacket():null;
    result.measurements.firstPacketMs=now()-t0;
    result.firstPacket=first?{bytes:first.byteLength,key:first.type==='key',timestamp:first.timestamp,sharedSourceBuffer:first.data.byteLength<first.data.buffer.byteLength}:null;
    for(const target of seeks){
      const start=now(),requestsBefore=network.length;
      try{const key=videoSink?await videoSink.getKeyPacket(target):null;
        const packet=videoSink?await videoSink.getPacket(target):audioSink?await audioSink.getPacket(target):null;
        result.seeks.push({target,lookupMs:now()-start,keyTimestamp:key?.timestamp??null,packetTimestamp:packet?.timestamp??null,requests:network.length-requestsBefore});
      }catch(e){result.seeks.push({target,error:safe(e)});}
    }
    if(extensions)await registerExtensions();
    if(video&&result.video.config&&typeof VideoDecoder!=='undefined'){
      const support=await VideoDecoder.isConfigSupported(result.video.config);
      result.videoSupport=support.supported;
      if(support.supported){
        const canvas=document.querySelector('#screen'),presenter=new WebCodecsPresenter(canvas,canvas.getContext('2d'));
        let decoded=0,presented=0,firstDecodedMs=null,firstPresentedMs=null,decodeError=null;
        const decoder=new VideoDecoder({error:e=>decodeError=safe(e),output:frame=>{
          decoded++;firstDecodedMs??=now()-t0;
          try{presenter.draw(frame,{width:frame.displayWidth,height:frame.displayHeight});presented++;firstPresentedMs??=now()-t0;}
          catch(e){decodeError=safe(e);}finally{frame.close();}
        }});
        try{
          decoder.configure(result.video.config);
          let packet=first,count=0,bytes=0,packetTime=0,submitTime=0;
          while(packet&&count<decodePackets){
            while(decoder.decodeQueueSize>=8)await new Promise(r=>setTimeout(r,2));
            const a=now(),chunk=packet.toEncodedVideoChunk();packetTime+=now()-a;
            const b=now();decoder.decode(chunk);submitTime+=now()-b;count++;bytes+=packet.byteLength;
            packet=await videoSink.getNextPacket(packet);
          }
          await decoder.flush();
          result.decode={submitted:count,decoded,presented,packetBytes:bytes,chunkConstructionMs:packetTime,decodeCallMs:submitTime,firstDecodedMs,firstPresentedMs,elapsedMs:now()-t0,queueDepth:decoder.decodeQueueSize,error:decodeError};
        }catch(e){result.decode={error:safe(e),decoded,presented};}
        finally{decoder.close();presenter.destroy();}
      }
    }
    if(extensions&&video&&(await video.getCodec())==='prores'){
      try{const sink=new VideoSampleSink(video),started=now();let decoded=0,firstMs=null;
        for await(const sample of sink.samples()){decoded++;firstMs??=now()-started;sample.close();if(decoded>=decodePackets)break;}
        result.extensionVideo={decoded,firstSampleMs:firstMs,elapsedMs:now()-started};
      }catch(e){result.extensionVideo={error:safe(e)};}
    }
    if(audio&&result.audio.config&&typeof AudioDecoder!=='undefined'){
      try{const support=await AudioDecoder.isConfigSupported(result.audio.config);result.audioSupport=support.supported;
        if(support.supported){let frames=0,error=null;const decoder=new AudioDecoder({error:e=>error=safe(e),output:data=>{frames++;data.close();}});decoder.configure(result.audio.config);
          let packet=await audioSink.getFirstPacket(),count=0;while(packet&&count<Math.min(decodePackets,40)){while(decoder.decodeQueueSize>=8)await new Promise(r=>setTimeout(r,2));decoder.decode(packet.toEncodedAudioChunk());count++;packet=await audioSink.getNextPacket(packet);}
          await decoder.flush();decoder.close();result.audioDecode={submitted:count,decoded:frames,error};}
      }catch(e){result.audioDecode={error:safe(e)};}
    }
    if(extensions&&audio&&['ac3','eac3','dts'].includes(await audio.getCodec())){
      try{const sink=new AudioSampleSink(audio),started=now();let decoded=0,firstMs=null;
        for await(const sample of sink.samples()){decoded++;firstMs??=now()-started;sample.close();if(decoded>=Math.min(decodePackets,60))break;}
        result.extensionAudio={decoded,firstSampleMs:firstMs,elapsedMs:now()-started};
      }catch(e){result.extensionAudio={error:safe(e)};}
    }
  }catch(e){result.errors.push(safe(e));}
  finally{result.video=result.video?{codec:result.video.config?.codec}:null;result.audio=result.audio?{codec:result.audio.config?.codec}:null;input.dispose();}
  return result;
}
globalThis.mediabunnyProbe=probe;
