// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as machine from '../../web/generated/internal/machine/remux-worker.js';
import * as controllerMachine from '../../web/generated/internal/machine/remux-controller.js';
function model(){let state=machine.initialRemuxWorker();return{get state(){return state;},send(command){const before=structuredClone(state),old=state,result=machine.transitionRemuxWorker(state,command);assert.deepEqual(old,before);state=result.state;assert.ok(Object.isFrozen(state));return result;},ready(){this.send({type:'call',id:1,method:'boot'});this.send({type:'finish',id:1,success:true});}};}
test('MSE boot, call and shutdown admission retire authority before shell cleanup',()=>{
 const m=model();assert.match(m.send({type:'call',id:1,method:'open'}).error,/not ready/);const boot=m.send({type:'call',id:1,method:'boot'});assert.equal(machine.remuxWorkerOperationCurrent(m.state,boot.operation),true);assert.match(m.send({type:'call',id:1,method:'boot'}).error,/Duplicate/);assert.match(m.send({type:'call',id:2,method:'boot'}).error,/already initialized/);
 m.send({type:'shutdown'});assert.equal(machine.remuxWorkerOperationCurrent(m.state,boot.operation),false);assert.equal(m.send({type:'finish',id:1,success:true}).accepted,undefined);assert.equal(m.send({type:'shutdown'}).accepted,undefined);m.send({type:'closed'});assert.equal(m.state.phase,'closed');
});
test('MSE source changes and seeks retire old requests and stale completion snapshots',()=>{
 const m=model();m.ready();const first=m.send({type:'call',id:2,method:'open',sourceKey:'a'}).operation;
 const play=m.send({type:'request',kind:'element',now:10}).request,auth=m.send({type:'request',kind:'refresh',now:20,sourceKey:'a'}).request;
 const next=m.send({type:'call',id:3,method:'seek'});assert.deepEqual(next.retire.map(request=>request.id),[play.id,auth.id]);assert.equal(m.state.requests.length,0);assert.equal(m.send({type:'reply',kind:'element',id:play.id}).accepted,undefined);
 assert.equal(machine.remuxWorkerOperationCurrent(m.state,first),false);assert.equal(m.send({type:'finish',id:2,success:true}).current,false);assert.equal(m.send({type:'finish',id:3,success:true}).current,true);
 m.send({type:'call',id:4,method:'open',sourceKey:'b'});assert.equal(m.send({type:'request',kind:'refresh',now:30,sourceKey:'a'}).accepted,undefined);
});
test('request identities, exact deadlines and duplicate completion remain independent',()=>{
 const m=model();m.ready();m.send({type:'call',id:2,method:'open',sourceKey:'a'});
 const a=m.send({type:'request',kind:'element',now:10}).request,b=m.send({type:'request',kind:'refresh',now:10,sourceKey:'a'}).request;
 assert.equal(a.deadline,10010);assert.equal(b.deadline,5010);assert.equal(m.send({type:'reply',kind:'refresh',id:a.id}).accepted,undefined);
 assert.equal(m.send({type:'deadline',kind:'element',id:a.id,now:10009}).wait,1);assert.equal(m.send({type:'deadline',kind:'element',id:a.id,now:10010}).accepted,true);assert.equal(m.send({type:'reply',kind:'element',id:a.id}).accepted,undefined);assert.deepEqual(m.state.requests.map(request=>request.id),[b.id]);
});
test('buffering acknowledgments remain valid across seek while shutdown retires every call',()=>{
 const m=model();m.ready();const buffering=m.send({type:'call',id:2,method:'setBuffering'}).operation;m.send({type:'call',id:3,method:'seek'});assert.equal(machine.remuxWorkerOperationCurrent(m.state,buffering),true);assert.equal(m.send({type:'finish',id:2,success:true}).current,true);m.send({type:'shutdown'});assert.equal(m.state.operations.length,0);
});
test('element observations are detached and optimistic seek/pause preserve the remaining facts',()=>{
 const input={currentTime:3,paused:false,playbackRate:2,readyState:4,ended:false,seeking:false,quality:{totalVideoFrames:10,droppedVideoFrames:2},ranges:[[0,9]]};
 const observed=machine.observeRemuxElement(input),seek=machine.seekRemuxElement(observed,5),paused=machine.pauseRemuxElement(seek);input.ranges[0][1]=99;input.quality.totalVideoFrames=90;
 assert.equal(observed.currentTime,3);assert.equal(seek.paused,false);assert.equal(paused.currentTime,5);assert.equal(paused.paused,true);assert.equal(paused.playbackRate,2);assert.equal(paused.ranges[0][1],9);assert.equal(paused.quality.totalVideoFrames,10);
});

const source=(await readFile(new URL('../../web/native-mse-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function adapter(){
 const messages=[],media=[],owners=[],timers=new Map();let sequence=0,callId=0,now=0,closed=0,attach=true,onPost,scheduleFailure;
 class Media extends EventTarget {static canConstructInDedicatedWorker=true;handle={};listeners=0;constructor(){super();media.push(this);}addEventListener(...args){this.listeners++;super.addEventListener(...args);}removeEventListener(...args){this.listeners--;super.removeEventListener(...args);}}
 class RemuxPlayer {constructor(video,options){this.video=video;this.options=options;this.generation=0;owners.push(this);}async open(source,target){this.source=source;this.generation++;return {target};}async seek(target){this.generation++;return {target};}setPlaybackIntent(playing){this.playing=playing;}async setBuffering(value){this.buffering=value;}snapshot(){return {position:this.video.currentTime,capability:{sourceBufferCreated:false}};}async destroy(){this.destroyed=true;}}
 const context=vm.createContext({...machine,RemuxPlayer,MediaSource:Media,DOMException,performance:{now:()=>now},Map,self:{},setTimeout:(callback,delay)=>{if(scheduleFailure)throw scheduleFailure;const id=++sequence;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++sequence,clearInterval(){},postMessage:message=>{messages.push(message);onPost?.(message);if(attach&&message.type==='element'&&message.operation==='attach')media.find(item=>item.handle===message.handle).dispatchEvent(new Event('sourceopen'));},close:()=>closed++});
 vm.runInContext(source,context);
 const send=data=>context.self.onmessage({data});
 return{messages,media,owners,timers,send,call:(method,value)=>send({type:'call',id:++callId,method,value}),get state(){return vm.runInContext('control',context);},get closed(){return closed;},set attach(value){attach=value;},set onPost(value){onPost=value;},set scheduleFailure(value){scheduleFailure=value;},set now(value){now=value;},fire(id){const timer=timers.get(id);timers.delete(id);timer.callback();},async ready(){await this.call('boot',{});await this.call('open',{source:{file:{}},target:0,refresh:true,sourceKey:'a'});return owners[0];}};
}
test('actual worker shutdown cancels boot attachment and blocks late owner construction/replies',async()=>{
 const a=adapter();a.attach=false;const boot=a.call('boot',{});assert.equal(a.media[0].listeners,1);await a.send({type:'shutdown'});await boot;a.media[0].dispatchEvent(new Event('sourceopen'));assert.equal(a.owners.length,0);assert.equal(a.media[0].listeners,0);assert.equal(a.timers.size,0);assert.equal(a.messages.filter(message=>message.type==='reply').length,0);assert.equal(a.closed,1);await a.send({type:'shutdown'});assert.equal(a.closed,1);
});
test('actual worker request cleanup precedes replacement and ignores late play/refresh replies',async()=>{
 const a=adapter(),owner=await a.ready(),play=owner.video.play(),refresh=owner.source.refreshAuthorization('segment');const rejected=[assert.rejects(play,{name:'AbortError'}),assert.rejects(refresh,{name:'AbortError'})];const old=a.messages.filter(message=>message.type==='refresh'||message.operation==='play');
 const sourceA=owner.source;await a.call('open',{source:{file:{}},target:8,refresh:true,sourceKey:'b'});await Promise.all(rejected);assert.equal(a.timers.size,0);assert.equal(a.state.requests.length,0);
 for(const request of old)await a.send({type:request.type==='refresh'?'refreshed':'element-result',id:request.id,update:{url:'stale'}});
 const before=a.messages.length;await assert.rejects(sourceA.refreshAuthorization('stale'),{name:'AbortError'});assert.equal(a.messages.length,before);await a.send({type:'shutdown'});assert.equal(owner.destroyed,true);
});
test('actual worker reschedules an early deadline and rejects one request exactly once',async()=>{
 const a=adapter(),owner=await a.ready();a.now=10;const playing=owner.video.play(),rejected=assert.rejects(playing,/Element play timed out/);const message=a.messages.at(-1),first=[...a.timers.keys()][0];a.now=10009;a.fire(first);assert.equal(a.timers.size,1);assert.equal(a.state.requests.length,1);a.now=10010;a.fire([...a.timers.keys()][0]);await rejected;await a.send({type:'element-result',id:message.id});assert.equal(a.timers.size,0);assert.equal(a.state.requests.length,0);
});
test('actual worker commits request ownership before a synchronous host response',async()=>{
 const a=adapter(),owner=await a.ready();a.onPost=message=>{if(message.operation==='play')void a.send({type:'element-result',id:message.id});};await owner.video.play();assert.equal(a.timers.size,0);assert.equal(a.state.requests.length,0);
});
test('actual worker keeps an acknowledged request final if posting subsequently throws',async()=>{
 const a=adapter(),owner=await a.ready();a.onPost=message=>{if(message.operation==='play'){void a.send({type:'element-result',id:message.id});throw Error('late post failure');}};await owner.video.play();assert.equal(a.timers.size,0);assert.equal(a.state.requests.length,0);
});
test('actual worker scheduling failures reject requests without abandoning their ownership',async()=>{
 for(const early of [false,true]){
  const a=adapter(),owner=await a.ready();if(!early)a.scheduleFailure=Error('schedule failed');const playing=owner.video.play(),rejected=assert.rejects(playing,/schedule failed/);
  if(early){a.scheduleFailure=Error('reschedule failed');a.now=9999;a.fire([...a.timers.keys()][0]);}
  await rejected;assert.equal(a.state.requests.length,0);assert.equal(a.timers.size,0);
 }
});
test('actual shutdown rejects outstanding requests before deferred owner cleanup completes',async()=>{
 const a=adapter(),owner=await a.ready(),play=owner.video.play(),refresh=owner.source.refreshAuthorization('pending');let finish;
 const rejected=[assert.rejects(play,{name:'AbortError'}),assert.rejects(refresh,{name:'AbortError'})];owner.destroy=()=>new Promise(resolve=>{finish=resolve;});const closing=a.send({type:'shutdown'});await Promise.all(rejected);
 assert.equal(a.state.phase,'closing');assert.equal(a.closed,0);assert.equal(a.timers.size,0);finish();await closing;assert.equal(a.state.phase,'closed');assert.equal(a.closed,1);
});
test('actual worker keeps stale open results out of accepted state publications',async()=>{
 const a=adapter(),owner=await a.ready();let complete;owner.open=()=>new Promise(resolve=>{complete=resolve;});const old=a.call('open',{source:{file:{}},target:3,sourceKey:'b'});await a.call('seek',7);complete({target:3});await old;const reply=a.messages.at(-1);assert.equal(reply.type,'reply');assert.match(reply.error,/Superseded/);assert.equal(reply.state,undefined);assert.equal(reply.value,undefined);
});
test('actual worker applies fresh host observations and emits optimistic element commands in order',async()=>{
 const a=adapter(),owner=await a.ready();await a.send({type:'element-state',state:{currentTime:4,paused:false,ended:false,seeking:false,readyState:4,playbackRate:2,quality:{totalVideoFrames:10,droppedVideoFrames:0},ranges:[[1,7]]}});assert.equal(owner.video.currentTime,4);assert.equal(owner.video.buffered.end(0),7);owner.video.currentTime=5;owner.video.pause();assert.equal(owner.video.currentTime,5);assert.equal(owner.video.paused,true);assert.equal(owner.video.playbackRate,2);assert.deepEqual(a.messages.slice(-2).map(message=>message.operation),['seek','pause']);await a.send({type:'shutdown'});const before=a.messages.length;owner.video.currentTime=9;owner.video.pause();assert.equal(a.messages.length,before);
});

const controllerSource=(await readFile(new URL('../../web/worker-remux-controller.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',"'file:///web/worker-remux-controller.js'");
test('actual controller refreshes only the requesting source and discards late authorization updates',async t=>{
 const messages=[],calls=[];let releaseAuthorization;
 class Worker extends EventTarget {
  emit(data){this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
  postMessage(message){messages.push(message);if(message.type==='call')this.emit({type:'reply',id:message.id,value:true});if(message.type==='shutdown')this.emit({type:'closed'});}
  terminate(){}
 }
 const worker=new Worker(),video={currentTime:0,paused:true,buffered:{length:0},getVideoPlaybackQuality:()=>({totalVideoFrames:0,droppedVideoFrames:0}),pause(){},removeAttribute(){},load(){}};
 const context=vm.createContext({...controllerMachine,runtimeWorker:()=>worker,URL,DOMException,Map,Promise,performance,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},document:{createElement:()=>({setAttribute(){},remove(){},contentWindow:{Worker}}),body:{append(){}}}});
 vm.runInContext(controllerSource,context);const Controller=vm.runInContext('WorkerRemuxController',context),controller=new Controller(video,{},()=>{throw Error('unexpected fallback');});t.after(()=>controller.destroy());
 await controller.open({file:{},refreshAuthorization:()=>{calls.push('a');return new Promise(resolve=>{releaseAuthorization=resolve;});}});const sourceA=messages.filter(message=>message.method==='open').at(-1).value.sourceKey;
 worker.emit({type:'refresh',id:11,sourceKey:sourceA,resource:'first'});await Promise.resolve();assert.deepEqual(calls,['a']);
 await controller.open({file:{},refreshAuthorization:()=>{calls.push('b');return {url:'current'};}});const sourceB=messages.filter(message=>message.method==='open').at(-1).value.sourceKey;
 releaseAuthorization({url:'retired'});await new Promise(resolve=>setImmediate(resolve));assert.equal(messages.some(message=>message.type==='refreshed'&&message.id===11),false);
 worker.emit({type:'refresh',id:12,sourceKey:sourceA,resource:'late'});worker.emit({type:'refresh',id:13,sourceKey:sourceB,resource:'current'});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['a','b']);assert.match(messages.find(message=>message.type==='refreshed'&&message.id===12).error,/Superseded/);assert.equal(messages.find(message=>message.type==='refreshed'&&message.id===13).update.url,'current');
});
