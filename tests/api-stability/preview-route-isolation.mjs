// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {deferred} from './virtual-effects.mjs';
const frame=time=>({time,width:8,height:8,image:{blob:new Blob(['image'])},path:'custom'});
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
async function fixture(candidate=false){
 const p=unitPlayer(),calls=[];p.dispatchControl({type:'source.configure',mode:'software',automatic:false});
 const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'software',preserve:false,planId:'software-fixture'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
 p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});p.dispatchControl({type:'source.finished',attempt});
 const backend=Object.assign(new EventTarget(),{properties:new Map(),planId:'software',destroy:async()=>{},pause:async()=>{},play:async()=>{}}),session={backend,surface:{remove(){}}};p.current=session;await p.registerSession(session,p.control.source.acceptedSession);
 if(candidate)p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'software',preserve:true,planId:'software-fixture'});
 for(const name of ['create','replace','select','recover','promote'])p[name]=()=>{calls.push(name);throw Error('preview entered playback '+name);};
 const ready=deferred(),result=deferred();let context,updates=0;
 p.preview.setProviders([{id:'controlled',priority:1,canHandle:()=>true,getFrame(request){context=request;ready.resolve();return result.promise;}}]);p.preview.enabled=true;
 const source=p.control.source,routing=p.control.routing,resources=p.control.resources,settings=p.control.settings;
 const check=()=>{assert.equal(p.control.source,source,'preview changed source/candidate authority');assert.equal(p.control.routing,routing,'preview changed route authority');assert.equal(p.control.resources,resources,'preview changed playback resource authority');assert.equal(p.control.settings,settings,'preview changed accepted settings');assert.equal(p.control.source.mode,'software','explicit pinned fixture route');assert.deepEqual(calls,[],'no playback creation/replacement/selection');};
 return{p,ready,result,check,get context(){return context;},get updates(){return updates;},request(signal){return p.preview.request({time:1,signal,onUpdate(){updates++;check();}});}};
}
for(const candidate of [false,true])for(const outcome of ['success','failure','clear','unload','disable','abort','providers'])test(`actual Player.preview ${outcome} preserves ${candidate?'candidate and accepted':'accepted'} route authority`,{timeout:3000},async()=>{
 const f=await fixture(candidate),controller=new AbortController(),work=f.request(controller.signal),settled=work.then(value=>({value}),error=>({error}));
 try{f.check();await f.ready.promise;f.check();
  if(outcome==='success'){f.context.publish(frame(1));f.result.resolve(frame(1));}
  else if(outcome==='failure')f.result.reject(Error('controlled preview failure'));
  else{if(outcome==='clear')f.p.preview.clear();if(outcome==='unload')f.p.preview.unload({start:1,end:2});if(outcome==='disable')f.p.preview.enabled=false;if(outcome==='abort')controller.abort();if(outcome==='providers')f.p.preview.setProviders([]);f.check();}
  const answer=await settled;f.check();
  if(outcome==='success'){assert.equal(answer.error,undefined);assert.equal(answer.value.path,'custom');assert.ok(f.updates>=1);}
  else if(outcome==='failure'){assert.equal(answer.error,undefined);assert.equal(answer.value,null);}
  else{assert.equal(answer.error?.name,'AbortError');f.context.publish(frame(1));f.result.resolve(frame(1));await flush();f.check();assert.equal(f.updates,0);}
 }finally{f.result.resolve(null);await flush();await f.p.destroy();}
});
test('preview-issued route-change behavioral mutation is caught at the public facade boundary',{timeout:3000},async()=>{
 const f=await fixture();const work=f.request(),settled=work.catch(()=>null);
 try{await f.ready.promise;f.check();f.p.dispatchControl({type:'source.configure',mode:'native'});assert.throws(f.check,/preview changed source/);}
 finally{f.p.preview.clear();f.result.resolve(null);await settled;await flush();await f.p.destroy();}
});
