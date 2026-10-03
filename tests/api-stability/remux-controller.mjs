// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as machine from '../../web/generated/internal/machine/remux-controller.js';
function model(){let state=machine.initialRemuxController();const commands=[];return{get state(){return state;},send(command){const previous=state,before=structuredClone(state),result=machine.transitionRemuxController(state,command);assert.deepEqual(previous,before);state=result.state;commands.push(command);return result;},ready(){const owner=this.send({type:'boot'}).owner;this.send({type:'booted',owner});return owner;},replay(){assert.deepEqual(commands.reduce((state,command)=>machine.transitionRemuxController(state,command).state,machine.initialRemuxController()),state);}};}
test('controller operations cannot finish a newer open/seek or use retired owners',()=>{
 const m=model(),owner=m.ready(),a=m.send({type:'begin',kind:'open'}),b=m.send({type:'begin',kind:'seek'});assert.equal(m.send({type:'finish',id:a.operation}).accepted,undefined);assert.equal(m.state.operation.id,b.operation);assert.equal(machine.remuxOperationCurrent(m.state,a.operation),false);m.send({type:'release',owner});assert.equal(machine.remuxOwnerCurrent(m.state,owner),false);assert.equal(m.send({type:'observe',owner,observation:{generation:99},tracks:false}).accepted,undefined);m.replay();
});
test('fallback policy permits capability negotiation only and requires the current operation',()=>{
 for(const [created,message,expected] of [[false,'Unsupported MSE format',true],[true,'Unsupported MSE format',false],[false,'Source transport failed',false]]){
  const m=model(),owner=m.ready(),operation=m.send({type:'begin',kind:'open'}).operation;m.send({type:'observe',owner,observation:{snapshot:{capability:{sourceBufferCreated:created}}},tracks:false});assert.equal(machine.remuxFallbackAllowed(m.state,operation,'source',message),expected);m.send({type:'release',owner});assert.equal(m.send({type:'local',operation,reason:'source',message}).accepted===true,expected);m.replay();
 }
 const m=model(),operation=m.send({type:'begin',kind:'open'}).operation;m.send({type:'begin',kind:'open'});assert.equal(machine.remuxFallbackAllowed(m.state,operation,'boot','unavailable'),false);
});
test('RPC admission owns deadlines and identity; release retires pending requests atomically',()=>{
 const m=model(),owner=m.ready(),a=m.send({type:'request',owner,method:'open',now:5}).request,b=m.send({type:'request',owner,method:'seek',now:10}).request;assert.equal(a.deadline,30005);assert.equal(m.send({type:'reply',owner:owner+1,id:a.id}).accepted,undefined);assert.equal(m.send({type:'deadline',owner,id:a.id,now:30004}).wait,1);assert.equal(m.send({type:'deadline',owner,id:a.id,now:30005}).accepted,true);assert.equal(m.send({type:'reply',owner,id:a.id}).accepted,undefined);assert.deepEqual(m.send({type:'release',owner}).retire.map(request=>request.id),[b.id]);assert.equal(m.state.requests.length,0);m.replay();
});
test('accepted metadata and policy are detached while track bytes have only an opaque token',()=>{
 const m=model(),owner=m.ready(),observation={duration:30,generation:2,frames:[[1,.04]],snapshot:{ranges:[[0,4]],capability:{sourceBufferCreated:true}}};m.send({type:'observe',owner,observation,tracks:true});const token=m.state.tracksToken;observation.frames[0][0]=99;observation.snapshot.ranges[0][1]=99;assert.equal(m.state.observation.frames[0][0],1);assert.equal(m.state.observation.snapshot.ranges[0][1],4);assert.equal('tracks' in m.state.observation,false);assert.equal(typeof token,'number');const policy={forwardSeconds:7};m.send({type:'buffering',owner,value:policy});policy.forwardSeconds=20;assert.equal(m.state.buffering.forwardSeconds,7);m.send({type:'observe',owner,observation:{duration:40},tracks:false});assert.equal(m.state.tracksToken,null);
});
test('varied owner histories preserve request uniqueness and terminal retirement under replay',()=>{
 for(let seed=1;seed<=9;seed++){
  const m=model();for(let i=0;i<120;i++){
   if(!m.state.owner)m.ready();const owner=m.state.owner.id;
   if(i%5===0)m.send({type:'begin',kind:i%2?'seek':'open'});
   const request=m.send({type:'request',owner,method:'seek',now:i*seed}).request;
   if(i%3===0)m.send({type:'release',owner});else m.send({type:'reply',owner,id:request.id});
   assert.equal(new Set(m.state.requests.map(request=>request.id)).size,m.state.requests.length);
  }
  m.send({type:'destroy'});const before=m.state;assert.equal(m.send({type:'boot'}).accepted,undefined);assert.equal(m.state,before);assert.equal(m.state.owner,null);assert.equal(m.state.operation,null);assert.equal(m.state.requests.length,0);m.replay();
 }
});

const source=(await readFile(new URL('../../web/worker-remux-controller.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',"'file:///web/worker-remux-controller.js'");
function adapter(t){
 const workers=[],frames=[],messages=[],timers=new Map(),blocked=new Set(),effects=[];let serial=0,now=0,onPost,onAppend,onCreate,onFrame,autoClose=true,fallbacks=0,fallbackFactory;
 class Worker extends EventTarget {
  terminated=0;
  emit(data){this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
  postMessage(message){messages.push({worker:this,...message});onPost?.(message,this);if(message.type==='call'&&!blocked.has(message.method))this.emit({type:'reply',id:message.id,value:{method:message.method},state:{generation:1,snapshot:{capability:{sourceBufferCreated:false}}}});if(message.type==='shutdown'&&autoClose)this.emit({type:'closed'});}
  terminate(){this.terminated++;}
 }
 const video={currentTime:0,paused:true,buffered:{length:0},getVideoPlaybackQuality:()=>({totalVideoFrames:0,droppedVideoFrames:0}),play(){effects.push('play');this.paused=false;return Promise.resolve();},pause(){effects.push('pause');this.paused=true;},removeAttribute(){effects.push('remove-src');},load(){effects.push('load');}};
 const context=vm.createContext({...machine,URL,DOMException,Map,Promise,performance:{now:()=>now},setTimeout:(callback,delay)=>{const id=++serial;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++serial,clearInterval(){},runtimeWorker:()=>{const worker=new Worker();workers.push(worker);onCreate?.(worker);return worker;},document:{createElement:()=>{const frame={removed:0,setAttribute(){},remove(){this.removed++;},contentWindow:{Worker}};frames.push(frame);onFrame?.(frame);return frame;},body:{append(frame){onAppend?.(frame);}}}});
 vm.runInContext(source,context);const Controller=vm.runInContext('WorkerRemuxController',context);
 const controller=new Controller(video,{fragmentDelivery:'separate'},()=>{fallbacks++;return fallbackFactory?fallbackFactory():{async open(){return {local:true};},async seek(){},async destroy(){},pause(){},async play(){},snapshot:()=>({})};});
 t.after(()=>{autoClose=true;for(const worker of workers)worker.emit({type:'closed'});return controller.destroy();});
 return{controller,video,workers,frames,messages,timers,blocked,effects,get fallbacks(){return fallbacks;},set fallback(value){fallbackFactory=value;},set onPost(value){onPost=value;},set onFrame(value){onFrame=value;},set onAppend(value){onAppend=value;},set onCreate(value){onCreate=value;},set autoClose(value){autoClose=value;},set now(value){now=value;},fire(id){const timer=timers.get(id);timers.delete(id);timer.callback();},async ready(){await controller.open({file:{}});effects.length=0;return controller;},last(method){return messages.filter(message=>message.method===method).at(-1);}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('old open settlement cannot clear a replacement operation or publish success',async t=>{
 const a=adapter(t),p=await a.ready();a.blocked.add('open');const first=p.open({file:{}}),rejected=assert.rejects(first,{name:'AbortError'});await tick();const old=a.last('open');const second=p.open({file:{}});await tick();const current=a.last('open');old.worker.emit({type:'reply',id:old.id,value:'old'});await rejected;assert.equal(p.starting,true);current.worker.emit({type:'reply',id:current.id,value:'new'});assert.equal(await second,'new');assert.equal(p.starting,false);
});
test('concurrent opens share boot and only the latest may install its fallback',async t=>{
 const a=adapter(t),p=a.controller;a.blocked.add('boot');const first=p.open({file:{}}),rejected=assert.rejects(first,{name:'AbortError'}),second=p.open({file:{}});const boot=a.last('boot');boot.worker.emit({type:'reply',id:boot.id,error:'Worker MSE unavailable'});await rejected;assert.deepEqual(await second,{local:true});assert.equal(a.workers.length,1);assert.equal(a.fallbacks,1);assert.equal(a.frames[0].removed,1);
});
test('source failures preserve a created SourceBuffer and only negotiation failure selects fallback',async t=>{
 for(const created of [false,true]){
  const a=adapter(t),p=await a.ready();a.blocked.add('open');const opening=p.open({file:{}});const rejected=created?assert.rejects(opening,/Unsupported MSE/):undefined;await tick();const request=a.last('open');request.worker.emit({type:'reply',id:request.id,error:'Unsupported MSE format',state:{snapshot:{capability:{sourceBufferCreated:created}}}});
  if(created){await rejected;assert.equal(a.fallbacks,0);assert.equal(a.workers[0].terminated,0);}else{assert.deepEqual(await opening,{local:true});assert.equal(a.fallbacks,1);assert.equal(a.workers[0].terminated,1);}
 }
});
test('release publishes one completion before synchronous shutdown reentry and keeps replacement handles',async t=>{
 const a=adapter(t),p=await a.ready();a.autoClose=false;let nested;a.onPost=message=>{if(message.type==='shutdown')nested=p.release();};const first=p.release();assert.equal(first,nested);assert.equal(p.release(),first);assert.equal(p.worker,undefined);await p.open({file:{}});const replacement=p.worker;a.workers[0].emit({type:'closed'});await first;assert.equal(p.worker,replacement);assert.equal(replacement.terminated,0);assert.equal(a.frames[0].removed,1);assert.equal(a.frames[1].removed,0);
});
test('destroy publishes its promise before cleanup and retires pending requests before late replies',async t=>{
 const a=adapter(t),p=await a.ready();a.blocked.add('seek');const seeking=p.seek(4),rejected=assert.rejects(seeking,{name:'AbortError'});const request=a.last('seek');let nested;a.onPost=message=>{if(message.type==='shutdown')nested=p.destroy();};const destruction=p.destroy();assert.equal(nested,destruction);await destruction;await rejected;request.worker.emit({type:'reply',id:request.id,value:true});assert.equal(p.pending.size,0);assert.equal(p.control.requests.length,0);assert.equal(a.workers[0].terminated,1);assert.equal(a.frames[0].removed,1);
});
test('destroy during iframe insertion or worker construction prevents late allocation publication',async t=>{
 for(const step of ['frame','append','create']){
  const a=adapter(t),p=a.controller;if(step==='frame')a.onFrame=()=>void p.destroy();else if(step==='append')a.onAppend=()=>void p.destroy();else a.onCreate=()=>void p.destroy();await assert.rejects(p.open({file:{}}),{name:'AbortError'});await p.destroy();assert.equal(a.fallbacks,0);assert.equal(a.frames[0].removed,1);assert.equal(p.worker,undefined);if(step==='create')assert.equal(a.workers[0].terminated,1);
 }
});
test('destroy during fallback acquisition waits for the retired local owner and never opens it',async t=>{
 const a=adapter(t),p=a.controller;a.blocked.add('boot');let destruction,finish,opened=0,cleaned=0;
 a.fallback=()=>{destruction=p.destroy();return{async open(){opened++;},destroy(){cleaned++;return new Promise(resolve=>{finish=resolve;});}};};
 const opening=p.open({file:{}}),rejected=assert.rejects(opening,{name:'AbortError'}),request=a.last('boot');request.worker.emit({type:'reply',id:request.id,error:'Worker MSE unavailable'});await tick();assert.equal(cleaned,1);assert.equal(opened,0);let settled=false;destruction.then(()=>{settled=true;});await tick();assert.equal(settled,false);finish();await rejected;await destruction;assert.equal(settled,true);assert.equal(p.local,undefined);
});
test('accepted-state observer reentry cannot let an opening operation succeed after destroy',async t=>{
 const a=adapter(t),p=await a.ready();p.onBufferingChange=()=>void p.destroy();await assert.rejects(p.open({file:{}}),{name:'AbortError'});await p.destroy();assert.equal(p.control.destroyed,true);
});
test('play preserves same-stack activation and a late play resolution cannot sync a retired owner',async t=>{
 const a=adapter(t),p=await a.ready();let resolve;a.video.play=()=>{a.effects.push('play');return new Promise(yes=>{resolve=yes;});};const playing=p.play();assert.deepEqual(a.effects,['play']);assert.equal(p.playIntent,true);p.pause();assert.deepEqual(a.effects,['play','pause']);assert.equal(p.playIntent,false);await p.destroy();const count=a.messages.length;resolve();await playing;assert.equal(a.messages.length,count);
});
test('retired worker errors and callbacks cannot abort or notify a replacement',async t=>{
 const a=adapter(t),p=await a.ready(),old=a.workers[0],errors=[];p.onError=error=>errors.push(error);await p.release();await p.open({file:{}});old.onerror({message:'retired',preventDefault(){throw Error('old event touched');}});old.onmessageerror();old.emit({type:'state',state:{generation:99}});assert.deepEqual(errors,[]);assert.equal(p.generation,1);assert.equal(a.workers[1].terminated,0);
});
test('request deadlines reschedule early wakeups and ignore late replies',async t=>{
 const a=adapter(t),p=await a.ready();a.blocked.add('setBuffering');a.now=10;const setting=p.setBuffering({forwardSeconds:9}),rejected=assert.rejects(setting,/timed out/),request=a.last('setBuffering'),timer=[...a.timers.keys()][0];a.now=30009;a.fire(timer);assert.equal(p.pending.size,1);a.now=30010;a.fire([...a.timers.keys()][0]);await rejected;request.worker.emit({type:'reply',id:request.id,value:true});assert.equal(p.options.buffering,undefined);assert.equal(p.pending.size,0);
});
test('release attempts all resources and records cleanup failure without orphaning callers',async t=>{
 const a=adapter(t),p=await a.ready(),worker=a.workers[0],frame=a.frames[0];worker.removeEventListener=()=>{throw Error('listener removal failed');};worker.terminate=()=>{worker.terminated++;throw Error('terminate failed');};frame.remove=()=>{frame.removed++;throw Error('frame cleanup failed');};await p.release();assert.equal(worker.terminated,1);assert.equal(frame.removed,1);assert.equal(p.control.cleanupFailures,3);assert.equal(p.releases.size,1);
});
test('detached worker capacity releases only after physical cleanup acknowledgment',async t=>{
 const a=adapter(t),p=a.controller;a.autoClose=false;
 for(let i=0;i<128;i++){await p.boot();void p.release();}
 assert.equal(p.releases.size,128);assert.equal(p.control.releasing.length,128);await assert.rejects(p.boot(),{name:'AbortError'});assert.equal(a.workers.length,128);
 a.workers[0].emit({type:'closed'});assert.equal(p.control.releasing.length,127);await p.boot();assert.equal(a.workers.length,129);assert.equal(p.control.owner.id,129);
});
test('failed physical termination retains pure owner capacity charge',async t=>{
 const a=adapter(t),p=await a.ready();a.workers[0].terminate=()=>{throw Error('terminate failed');};await p.release();assert.equal(p.control.releasing.length,1);assert.equal(p.releases.size,1);await p.releaseResources(1);assert.equal(p.control.releasing.length,1);assert.equal(p.releases.size,1);
});
