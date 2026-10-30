// SPDX-License-Identifier: Apache-2.0
/** Adapter for the existing RemuxPlayer producer messages. It adds no clock,
 * SourceBuffer, playback loop or source transport policy. */
export function createRemuxProducer(stream,{tracks,dispose=()=>{},raps=[]}={}){
  let stopped=false,phase='new',pulling=false,initialized=false,earlyFailure=false,earlyError;
  const producer=new EventTarget();producer.onmessage=null;
  const emit=data=>{if(stopped)return;const event=new MessageEvent('message',{data});producer.onmessage?.(event);producer.dispatchEvent(event);};
  const fail=error=>{
    // The muxer can fail while acquisition is still handing this producer to
    // its owner. Retain that failure until init installs the message observer.
    if(!initialized&&!stopped){earlyFailure=true;earlyError=error;return;}
    if(stopped||phase==='failed')return;phase='failed';
    emit({type:'error',message:error?.message??String(error),code:error?.code});
    try{producer.terminate();}catch{/* Preserve the primary producer failure. */}
  };
  const stats=()=>({kind:'mediabunny-segment-copy',generatedBytes:stream.stats.totalBytes,...stream.stats});
  producer.postMessage=message=>{
    if(stopped)return;
    if(message.type==='close'){producer.terminate();return;}
    if(message.type==='init'&&!initialized){initialized=true;if(earlyFailure){fail(earlyError);return;}}
    if(message.type==='init'&&phase==='new'){
      phase='negotiating';queueMicrotask(()=>emit({type:'negotiate',candidates:[{container:'mp4',mime:stream.mime}],duration:stream.duration,windowed:false}));return;
    }
    if(message.type==='select-container'&&phase==='negotiating'&&message.container==='mp4'){
      phase='initializing';
      void stream.next().then(result=>{
        if(stopped)return;
        if(result.done||result.value.kind!=='initialization')throw new Error('Streaming initialization is unavailable');
        phase='ready';const bytes=result.value.bytes;
        emit({type:'ready',duration:stream.duration,mime:stream.mime,tracks,buffer:bytes.buffer,stats:stats()});
      }).catch(fail);return;
    }
    if(message.type==='next'&&phase==='ready'&&!pulling&&Number.isSafeInteger(message.id)){
      pulling=true;
      void stream.next().then(result=>{
        if(stopped)return;
        pulling=false;
        if(!result.done&&result.value.kind!=='fragment')throw new Error('Unexpected streaming record');
        if(result.done)phase='ended';
        emit({type:'fragment',id:message.id,buffer:result.done?new ArrayBuffer(0):result.value.bytes.buffer,more:!result.done,raps,stats:stats()});
      }).catch(error=>{pulling=false;fail(error);});return;
    }
    fail(new Error('Invalid streaming producer command'));
  };
  producer.terminate=()=>{
    if(stopped)return;stopped=true;phase='closed';producer.onmessage=null;
    void stream.cancel(new DOMException('Remux generation retired','AbortError')).catch(()=>{});dispose();
  };
  void stream.done.catch(fail);
  return producer;
}
