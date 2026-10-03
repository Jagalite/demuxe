// SPDX-License-Identifier: MIT
// Physical pointers, pixel buffers and native execution remain in this adapter.
import {PrivatePCMTransport} from './playback-pcm.js';
import {admitPlaybackHostWork,startPlaybackHostWork,finishPlaybackHostWork,initialPlaybackHost,playbackHostCurrent,playbackHostFailureCurrent,beginPlaybackHostCreate,finishPlaybackHostCreate,playbackHostNativeDestroyed,resetPlaybackHostSource,setPlaybackHostPreroll,playbackHostSeekPreroll,observePlaybackHostEvent,playbackHostEventBudget,failPlaybackHostSource,beginPlaybackHostRender,presentPlaybackHost,closePlaybackHost,finishPlaybackHostClose} from '../generated/internal/machine/playback-host.js';
export class PrivatePlaybackHost {
  constructor(engine,canvas,width,height,{fatalCommandErrors=true,retained,channels=2}={}) {
    this.control=initialPlaybackHost(channels,fatalCommandErrors);
    this.engine=engine;this.canvas=canvas;this.retained=retained;
    this.context=canvas.getContext('2d',{willReadFrequently:true});
    this.width=canvas.width=width;this.height=canvas.height=height;
    this.work=new Map();this.draining=false;this.events=[];this.properties={};
  }
  get closed(){return this.control.phase!=='active';}
  get created(){return this.control.created;}
  get draws(){return this.control.draws;}
  get channels(){return this.control.channels;}
  get seekPreroll(){return this.control.seekPreroll;}
  setNativeDestroyed(){this.control=playbackHostNativeDestroyed(this.control);}
  resetSource(){this.control=resetPlaybackHostSource(this.control);this.rejectRetiredWork();this.properties={};this.events=[];this.sourceError=undefined;}
  setSeekPreroll(duration){this.control=setPlaybackHostPreroll(this.control,duration);}
  current(epoch){return playbackHostCurrent(this.control,epoch);}
  assertCurrent(epoch){if(!this.current(epoch))throw Error('Playback host closed or replaced');}
  rejectRetiredWork(){
    const live=new Set(this.control.queue.map(work=>work.id));if(this.control.activeWork)live.add(this.control.activeWork.id);
    for(const [id,pending] of this.work)if(!live.has(id)){this.work.delete(id);pending.reject(Error('Playback host closed or replaced'));}
  }
  serial(operation,cleanup=false){
    const admission=admitPlaybackHostWork(this.control,cleanup);this.control=admission.state;
    if(!admission.work)return Promise.reject(Error(admission.error));
    const completion=new Promise((resolve,reject)=>this.work.set(admission.work.id,{operation,resolve,reject}));
    // Keep ignored internal completions handled without swallowing caller errors.
    void completion.catch(()=>{});
    if(!this.draining){this.draining=true;void Promise.resolve().then(()=>this.drainWork());}
    return completion;
  }
  async drainWork(){
    try{for(;;){
      const started=startPlaybackHostWork(this.control);this.control=started.state;if(!started.work)return;
      const work=started.work,pending=this.work.get(work.id);
      try{const result=await pending.operation();if(!work.cleanup)this.assertCurrent(work.epoch);pending.resolve(result);}
      catch(error){pending.reject(error);}
      finally{this.work.delete(work.id);this.control=finishPlaybackHostWork(this.control,work.id);}
    }}finally{this.draining=false;}
  }
  // Acquire the native method before checking authority: property access itself
  // can retire the host. Cleanup calls use the separate physical path below.
  async invoke(epoch,name,...args){const call=this.engine.call;this.assertCurrent(epoch);const result=await call.call(this.engine,name,...args);this.assertCurrent(epoch);return result;}
  async create(source,audioPort,latencyUs=0){
    const epoch=this.control.epoch;
    return this.serial(async()=>{
      this.control=beginPlaybackHostCreate(this.control,epoch);
      try{
        const sourceHost=this.engine.source,setSource=sourceHost.setSource;this.assertCurrent(epoch);setSource.call(sourceHost,source);this.assertCurrent(epoch);
        if(await this.invoke(epoch,'web_audio_configure',this.channels)!==0)throw Error('Native audio layout rejected');
        if(this.retained){await this.invoke(epoch,'web_decoder_enable',2);await this.invoke(epoch,'web_experiment_skip_render',1);}
        const call=this.engine.call;this.assertCurrent(epoch);
        const rc=await call.call(this.engine,'web_create',48000);
        this.control=finishPlaybackHostCreate(this.control,rc===0);
        this.assertCurrent(epoch);if(rc!==0)throw Error('web_create: '+rc);
        if(audioPort){const ptr=await this.invoke(epoch,'web_audio_ptr'),capacity=this.engine.raw.web_audio_capacity?await this.invoke(epoch,'web_audio_capacity'):8192;this.assertCurrent(epoch);this.audio=new PrivatePCMTransport(this.engine,ptr,audioPort,latencyUs,capacity,this.channels);this.assertCurrent(epoch);}
      }catch(error){this.control=finishPlaybackHostCreate(this.control,false);throw error;}
    });
  }
  async strings(epoch,values,invoke){
    const pointers=[];let failure,result,failed=false;
    try{
      for(const value of values){
        const bytes=new TextEncoder().encode(value+'\0'),call=this.engine.call;this.assertCurrent(epoch);
        const ptr=await call.call(this.engine,'malloc',bytes.length);
        // Capture the pointer before checking retirement; late allocation still
        // has exactly one mandatory free even after close revokes the command.
        if(ptr)pointers.push(ptr);this.assertCurrent(epoch);if(!ptr)throw Error('Command allocation failed');
        const memory=this.engine.raw.memory.buffer;this.assertCurrent(epoch);new Uint8Array(memory).set(bytes,ptr);
      }
      result=await invoke(pointers);
    }catch(error){failure=error;failed=true;}
    const errors=[];
    for(const ptr of pointers){try{await this.engine.call('free',ptr);}catch(error){errors.push(error);}}
    if(failed)throw failure;if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Native string cleanup failed');return result;
  }
  command(id,...args){
    if(!Number.isInteger(id)||id<0||id>0xffffffff||args.length<1||args.length>4||args.some(a=>typeof a!=='string'||a.includes('\0')||a.length>16384))throw Error('Invalid native command');
    const epoch=this.control.epoch;
    return this.serial(()=>{this.assertCurrent(epoch);return this.strings(epoch,args,async pointers=>{const rc=await this.invoke(epoch,'web_command_args',id,...pointers,...Array(4-pointers.length).fill(0));if(rc<0)throw Error('Command rejected: '+rc);});});
  }
  addSubtitle(id,path,title,language,select){
    if(![path,title,language].every(value=>typeof value==='string'&&!value.includes('\0')&&value.length<=4096))throw Error('Invalid subtitle metadata');
    const epoch=this.control.epoch;
    return this.serial(()=>{this.assertCurrent(epoch);return this.strings(epoch,[path,title,language],async pointers=>{const rc=await this.invoke(epoch,'web_add_subtitle',id,...pointers,+select);if(rc<0)throw Error('Subtitle command rejected: '+rc);});});
  }
  async seek(id,position){
    if(!Number.isFinite(position)||position<0)throw Error('Invalid seek position');
    const epoch=this.control.epoch,preroll=playbackHostSeekPreroll(this.control,position);
    await this.command(id,'set','hr-seek-demuxer-offset',String(preroll));this.assertCurrent(epoch);
    return this.command(id+0x40000000,'seek',String(position),'absolute+exact');
  }
  pump(force=false,render=true){
    const epoch=this.control.epoch;
    return this.serial(async()=>{
      if(!this.current(epoch))return [];
      const check=()=>{const error=this.engine.decoder?.error;this.assertCurrent(epoch);if(error)throw Error('Retained decoder: '+error);};check();
      const audioError=this.audio?.error;this.assertCurrent(epoch);if(audioError)throw Error(audioError);
      if(this.control.sourceFailed)throw this.sourceError;
      const failures=this.engine.source.drainFailures(),generation=this.engine.source.generation;this.assertCurrent(epoch);
      const currentFailures=failures.filter(failure=>playbackHostFailureCurrent(failure.generation,generation));
      if(currentFailures.length){
        const error=new Error('Source transport: '+currentFailures.map(failure=>String(failure.cause??failure.kind)).join('; '),{cause:currentFailures[0].cause});this.assertCurrent(epoch);
        this.sourceError=error;this.control=failPlaybackHostSource(this.control,epoch);this.engine.source.cancelSource();throw error;
      }
      const events=[];
      for(let i=0;i<playbackHostEventBudget();i++){
        // Unlike other calls this result may be an owned string pointer, so
        // retirement must be checked after capturing its cleanup obligation.
        const call=this.engine.call;this.assertCurrent(epoch);const ptr=await call.call(this.engine,'web_event');
        if(!ptr){this.assertCurrent(epoch);check();break;}
        let event;
        try{this.assertCurrent(epoch);check();event=JSON.parse(this.engine.module.UTF8ToString(ptr));this.assertCurrent(epoch);}
        finally{await this.engine.call('free',ptr);}
        this.assertCurrent(epoch);
        const decision=observePlaybackHostEvent(this.control,epoch,{kind:event.event,name:event.name,duration:event.name==='duration'?Number(event.data):undefined,error:event.error});this.control=decision.state;
        if(decision.fatal)throw Error('Command reply failed: '+JSON.stringify(event));
        if(!decision.accepted)break;
        if(event.event==='property-change')this.properties[event.name]=event.data;
        events.push(event);this.events.push(event);if(decision.trim)this.events.shift();
      }
      if(!render)return events;
      const width=this.width,height=this.height,admission=beginPlaybackHostRender(this.control,epoch,width,height,force);this.control=admission.state;
      if(!admission.accepted)return events;
      const ptr=await this.invoke(epoch,'web_render',width,height,+admission.force);check();
      if(this.retained){
        if(ptr){const select=this.retained.select;this.assertCurrent(epoch);await select.call(this.retained,this.engine,this.properties);}check();
        const present=this.retained.present;this.assertCurrent(epoch);const presented=present.call(this.retained,this.context,this.canvas);this.assertCurrent(epoch);
        if(presented){await this.invoke(epoch,'web_presented');this.control=presentPlaybackHost(this.control,epoch);}
      }else if(ptr){
        if(!this.imageData||this.imageData.width!==width||this.imageData.height!==height)this.imageData=new ImageData(width,height);
        this.assertCurrent(epoch);const rgba=this.imageData.data,memory=this.engine.raw.memory.buffer;this.assertCurrent(epoch);
        rgba.set(new Uint8ClampedArray(memory,ptr,rgba.length));for(let i=3;i<rgba.length;i+=4)rgba[i]=255;
        const put=this.context.putImageData;this.assertCurrent(epoch);put.call(this.context,this.imageData,0,0);this.assertCurrent(epoch);
        await this.invoke(epoch,'web_presented');this.control=presentPlaybackHost(this.control,epoch);
      }
      return events;
    });
  }
  picture(){return this.context.getImageData(0,0,this.width,this.height).data.slice();}
  destroy(){
    if(this.destroyPromise)return this.destroyPromise;
    // Publish retirement and shared completion before callback-capable cleanup.
    this.control=closePlaybackHost(this.control);this.rejectRetiredWork();let resolve,reject;
    this.destroyPromise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const errors=[];try{this.engine.source.cancelSource();}catch(error){errors.push(error);}
    this.serial(async()=>{
      let result;
      try{if(this.audio)await this.audio.stop();}catch(error){errors.push(error);}
      try{if(this.created)await this.engine.call('web_destroy');}catch(error){errors.push(error);}
      this.control=playbackHostNativeDestroyed(this.control);
      try{result={audio:this.audio?.snapshot(),scheduler:this.engine.scheduler.snapshot(),source:this.engine.source.snapshot()};}catch(error){errors.push(error);}
      try{this.engine.dispose();}catch(error){errors.push(error);}
      try{this.retained?.clear();}catch(error){errors.push(error);}
      try{if(result){result.retained=this.retained?.snapshot();result.decoder=this.engine.decoder?.snapshot();}}catch(error){errors.push(error);}
      this.control=finishPlaybackHostClose(this.control);
      if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Playback cleanup failed');return result;
    },true).then(resolve,reject);
    return this.destroyPromise;
  }
}
