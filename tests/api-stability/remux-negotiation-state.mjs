// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxLifecycle,transitionRemuxLifecycle} from '../../web/generated/internal/machine/remux-lifecycle.js';
import {RemuxPlayer} from '../../web/native-remux-player.js';
function machine(){
 let state=initialRemuxLifecycle();const history=[];
 const send=command=>{const old=state,before=structuredClone(old),result=transitionRemuxLifecycle(state,command);assert.deepEqual(old,before);state=result.state;history.push(structuredClone(command));assert.ok(Object.isFrozen(state.negotiation));return result;};
 return {get state(){return state;},send,command(command,generation=state.generation){return send({type:'negotiation',generation,command}).negotiation??{accepted:false};},begin(){send({type:'open'});const restart=send({type:'restart',target:0,duration:undefined});return send({type:'begin',restartId:restart.restartId}).generation;},replay(){assert.deepEqual(history.reduce((state,command)=>transitionRemuxLifecycle(state,command).state,initialRemuxLifecycle()),state);}};
}
const candidates=[{container:'mp4',mime:'video/mp4'},{container:'webm',mime:'video/webm'}];
test('candidate order, prior initialization rejection, support precedence and selection are pure',()=>{
 const m=machine();m.begin();const request=m.command({type:'start',candidates,windowed:false,browserSupported:true});
 assert.equal(m.command({type:'candidate',id:request.id,rejected:['video/mp4']}).action,'skip');
 const probe=m.command({type:'candidate',id:request.id,rejected:[]});assert.equal(probe.candidate.container,'webm');assert.deepEqual(probe.mimes,['video/webm']);
 assert.equal(m.command({type:'candidate',id:request.id,rejected:[],support:{hint:false,type:true,lanes:true}}).action,'acquire');
 m.command({type:'acquired',id:request.id});assert.equal(m.state.negotiation.mime,'video/webm');assert.equal(m.state.negotiation.apiHint,'MediaSource.isTypeSupported(video/webm)=false');assert.equal(m.state.negotiation.sourceBufferCreated,true);
 assert.deepEqual(m.state.negotiation.attempts,[{...candidates[0],rejected:'Initialization append failed'},{...candidates[1],selected:true}]);assert.equal(m.command({type:'acquired',id:request.id}).accepted,false);m.replay();
});
test('unsupported lanes and browser reject with the existing policy strings',()=>{
 const m=machine();m.begin();assert.equal(m.command({type:'start',candidates,windowed:true,lanes:['a'],browserSupported:false}).code,'UNSUPPORTED_TIMELINE');
 const {id}=m.command({type:'start',candidates,windowed:true,lanes:[],browserSupported:true});m.command({type:'candidate',id,rejected:[],support:{hint:true,type:true,lanes:false}});
 assert.equal(m.state.negotiation.attempts[0].rejected,'Error: Unsupported selected track packaging');m.command({type:'candidate',id,rejected:[],support:{hint:false,type:false,lanes:false}});assert.equal(m.state.negotiation.attempts[1].rejected,'MSE type unsupported');assert.equal(m.command({type:'candidate',id,rejected:[]}).error,'Unsupported MSE packaging for selected codecs');
});
test('observations copy caller data and preserve same-source duration while new sources clear it',()=>{
 const m=machine();m.begin();const tracks=[{id:1,type:'video',codec:'h264',selected:true}];const input=[{...candidates[0]}];m.command({type:'start',candidates:input,windowed:false,browserSupported:true});input[0].mime='changed';assert.equal(m.state.negotiation.candidates[0].mime,'video/mp4');
 m.command({type:'ready',target:2,duration:30,mime:'video/mp4',tracks,supported:true});tracks[0].codec='changed';assert.equal(m.state.negotiation.tracks[0].codec,'h264');assert.equal(Object.isFrozen(tracks[0]),false);
 m.send({type:'open'});assert.equal(m.state.negotiation.duration,30);m.send({type:'open',sourceChanged:true});assert.equal(m.state.negotiation.duration,undefined);assert.equal(m.state.negotiation.mime,'video/mp4');
});
for(const stage of ['sourceopen','source-init','target'])test(stage+' wait has exact deadline and replacement lease ownership',()=>{
 const m=machine();m.begin();const wait=m.command({type:'wait',stage,now:5});const deadline=stage==='target'?20005:10005;
 assert.equal(m.command({type:'wait-check',id:wait.id,now:deadline-1,complete:false}).action,'waiting');
 if(stage==='target')assert.equal(m.command({type:'wait-check',id:wait.id,now:deadline,complete:false}).action,'waiting');
 assert.match(m.command({type:'wait-check',id:wait.id,now:deadline+(stage==='target'?1:0),complete:false}).error,/timeout|timed out/);
 const next=m.command({type:'wait',stage,now:100});assert.ok(next.id>wait.id);const before=m.state;assert.equal(m.command({type:'wait-check',id:wait.id,now:100,complete:true}).accepted,false);assert.equal(m.state,before);assert.equal(m.command({type:'wait-check',id:next.id,now:101,complete:true}).action,'complete');m.replay();
});
for(const type of ['open','restart','retire','failure','destroy'])test(type+' retires packaging and startup completion authority together',()=>{
 const m=machine(),generation=m.begin(),wait=m.command({type:'wait',stage:'target',now:0}),negotiation=m.command({type:'start',candidates,windowed:false,browserSupported:true});m.send({open:{type},restart:{type,target:2,duration:30},retire:{type,generation},failure:{type,generation,message:'failed',playing:false},destroy:{type}}[type]);
 const before=m.state;assert.equal(m.command({type:'acquired',id:negotiation.id},generation).accepted,false);assert.equal(m.command({type:'wait-check',id:wait.id,now:1,complete:true},generation).accepted,false);assert.equal(m.state,before);m.replay();
});
function shell(t){
 const video={currentTime:1,paused:true,pause(){},removeAttribute(){},load(){}},p=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi'});clearInterval(p.timer);t.after(()=>p.destroy());
 const begin=()=>{p.transitionLifecycle({type:'open'});const restart=p.transitionLifecycle({type:'restart',target:0,duration:undefined});p.transitionLifecycle({type:'begin',restartId:restart.restartId});};begin();
 const sent=[],removed=[],appended=[],listeners=new Set(),sb={buffered:{length:0},updating:false,addEventListener(type,handler){listeners.add(handler);},removeEventListener(type,handler){listeners.delete(handler);},appendBuffer(buffer){appended.push(buffer);}},media={readyState:'open',addSourceBuffer(){return sb;},removeSourceBuffer(buffer){removed.push(buffer);}},worker={postMessage(message){sent.push(message);},terminate(){}};
 p.sbs=[sb];p.sb=sb;p.media=media;p.worker=worker;const original=globalThis.MediaSource;globalThis.MediaSource={isTypeSupported:()=>true};t.after(()=>{globalThis.MediaSource=original;});
 const replace=()=>{p.stopWorkers();begin();p.media={replacement:true};p.worker={replacement:true,postMessage(){},terminate(){}};p.sbs=[];p.sb=null;};
 return {p,sb,media,worker,sent,removed,appended,listeners,replace};
}
test('actual candidate acquisition after replacement releases only the old MediaSource resource',t=>{
 const {p,sb,media,worker,sent,removed,replace}=shell(t);media.addSourceBuffer=()=>{replace();return sb;};const replacement=[];p.negotiate({candidates,windowed:false},p.generation,media,worker,{},new Set());assert.deepEqual(removed,[sb]);assert.deepEqual(sent,[{type:'close'}]);assert.equal(p.media.replacement,true);assert.equal(p.worker.replacement,true);assert.deepEqual(p.sbs,replacement);assert.equal(p.negotiation.sourceBufferCreated,false);
});
test('actual support probe replacement cannot allocate or select a container',t=>{
 const {p,media,worker,replace,sent}=shell(t);let adds=0;media.addSourceBuffer=()=>{adds++;};globalThis.MediaSource.isTypeSupported=()=>{replace();return true;};p.negotiate({candidates,windowed:false},p.generation,media,worker,{},new Set());assert.equal(adds,0);assert.deepEqual(sent,[{type:'close'}]);
});
for(const effect of ['duration','mode','timestampOffset','listener'])test('actual ready '+effect+' reentry cannot initialize replacement SourceBuffers',t=>{
 const {p,sb,media,appended,listeners,replace}=shell(t),generation=p.generation;let effects=0;
 if(effect==='listener'){sb.addEventListener=(type,handler)=>{listeners.add(handler);effects++;replace();};}else Object.defineProperty(effect==='duration'?media:sb,effect,{set(){effects++;replace();},configurable:true});
 p.initialize({duration:30,mime:'video/mp4',tracks:[],buffers:[new ArrayBuffer(2)]},generation,media,0);assert.equal(effects,1);assert.equal(p.media.replacement,true);assert.deepEqual(appended,[]);assert.equal(p.bufferState.updates.length,0);assert.equal(listeners.size,0);
});
test('actual ready captures initialization receipt generation before invoking append',t=>{
 const {p,media,sb,appended}=shell(t);p.initialize({duration:30,mime:'video/mp4',tracks:[{id:0,type:'video'}],buffers:[new ArrayBuffer(2)]},p.generation,media,0);assert.equal(appended.length,1);assert.equal(p.duration,30);assert.equal(media.duration,31);assert.equal(sb.mode,'segments');assert.equal(sb.timestampOffset,0);assert.equal(p.bufferState.initAccepted,false);
});
test('actual startup subscription acquired after retirement is released and cannot settle a successor',async t=>{
 const {p,replace}=shell(t);let cleaned=0,oldFinish;const first=p.waitForStartup('sourceopen',p.generation,finish=>{oldFinish=finish;replace();return ()=>cleaned++;});await assert.rejects(first,{name:'AbortError'});assert.equal(cleaned,1);
 let finishNext;const next=p.waitForStartup('sourceopen',p.generation,finish=>{finishNext=finish;return ()=>cleaned++;});const current=p.negotiation.wait.id;oldFinish();assert.equal(p.negotiation.wait.id,current);finishNext(null,'ready');assert.equal(await next,'ready');assert.equal(cleaned,2);
});
test('actual synchronous startup completion still releases its subscription exactly once',async t=>{
 const {p}=shell(t);let cleaned=0;assert.equal(await p.waitForStartup('sourceopen',p.generation,finish=>{finish(null,7);return ()=>cleaned++;}),7);assert.equal(cleaned,1);assert.equal(p.cancelWait,null);assert.equal(p.negotiation.wait,null);
});
test('actual start does not rearm its target poll after coverage observation retires the generation',async t=>{
 const names=['MediaSource','Worker','MessageChannel','location','setTimeout'],original=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 t.after(()=>{for(const [name,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
 class Media extends EventTarget {addEventListener(type,handler,options){super.addEventListener(type,handler,options);if(type==='sourceopen')queueMicrotask(()=>this.dispatchEvent(new Event(type)));}}
 class Worker {constructor(url){this.source=String(url).includes('source-worker');}postMessage(data){if(this.source&&data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready',size:1}}));}terminate(){}}
 globalThis.MediaSource=Media;globalThis.Worker=Worker;globalThis.MessageChannel=class {port1={close(){}};port2={close(){}};};Object.defineProperty(globalThis,'location',{value:{origin:'null'},configurable:true});
 const nativeTimeout=globalThis.setTimeout;let retired=false,latePolls=0;globalThis.setTimeout=(callback,delay,...args)=>{if(retired&&delay===20)latePolls++;return nativeTimeout(callback,delay,...args);};
 const video={currentTime:1,paused:true,pause(){},removeAttribute(){},load(){}},p=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi',attachMedia(){}});clearInterval(p.timer);t.after(()=>p.destroy());
 let observations=0;p.hasStartupCoverage=()=>{if(++observations===2){retired=true;p.stopWorkers();}return false;};
 await assert.rejects(p.open({file:{}}),{name:'AbortError'});assert.equal(observations,2);assert.equal(latePolls,0);assert.equal(p.cancelWait,null);assert.equal(p.negotiation.wait,null);
});
test('actual early startup timer rescheduling failure rejects and releases the wait',async t=>{
 const {p}=shell(t);let now=0,callback,calls=0,cleaned=0;t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',fn=>{if(++calls===2)throw Error('timer unavailable');callback=fn;return 1;});
 const pending=p.waitForStartup('sourceopen',p.generation,()=>()=>cleaned++),rejected=assert.rejects(pending,/timer unavailable/);now=1;callback();await rejected;assert.equal(cleaned,1);assert.equal(p.cancelWait,null);assert.equal(p.negotiation.wait,null);
});
