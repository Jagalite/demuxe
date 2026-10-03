// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSource,transitionSource,sourceSessionFault} from '../../web/generated/internal/machine/source.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
function begin(p){return p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'native',preserve:false,planId:'native-direct'}).id;}
function accept(p,attempt){for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});p.dispatchControl({type:'source.finished',attempt});}
async function candidate(p){const attempt=begin(p),id=p.control.source.candidate.session,backend=Object.assign(new EventTarget(),{destroy:async()=>{},properties:new Map()}),session={backend,surface:{remove(){}}};await p.registerSession(session,id);p.observeBackend(session,id);return{attempt,id,session,send(type,detail){const event=new Event(type);Object.defineProperty(event,'detail',{value:detail});backend.dispatchEvent(event);}};}
test('fault identities remain immutable, independent for two owners and absent after retirement',()=>{
 let state=initialSource();const send=input=>{const result=transitionSource(state,input);state=result.state;return result;};send({type:'source.begin',operationEpoch:1,mode:'native',preserve:false,planId:'native-direct'});const id=state.candidate.id,session=state.candidate.session,before=state;assert.equal(send({type:'source.fault',session}).accepted,true);assert.equal(before.candidate.fault,null);assert.equal(sourceSessionFault(state,session),1);for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])send({type,attempt:id});send({type:'source.accept',attempt:id,operationEpoch:1,settings:{},planMatches:true});send({type:'source.finished',attempt:id});assert.equal(sourceSessionFault(state,session),1);send({type:'source.begin',operationEpoch:1,mode:'software',preserve:true,planId:'software'});const second=state.candidate.session;send({type:'source.fault',session:second});assert.equal(sourceSessionFault(state,session),1);assert.equal(sourceSessionFault(state,second),2);send({type:'source.clear'});assert.equal(sourceSessionFault(state,session),null);assert.equal(send({type:'source.fault',session}).accepted,false);assert.equal(state.faultSerial,2);
});
test('actual backend errors preserve original objects behind a read-only pure identity',async()=>{
 const p=unitPlayer(),c=await candidate(p),one=Error('first'),two=Error('second');c.send('error',one);assert.equal(c.session.error,one);const first=p.control.source.candidate.fault;assert.equal(typeof first,'number');assert.throws(()=>{c.session.error=two;},TypeError);c.send('error',two);assert.equal(c.session.error,two);assert.ok(p.control.source.candidate.fault>first);accept(p,c.attempt);assert.equal(c.session.error,two);assert.equal(p.control.source.acceptedFault,p.control.source.faultSerial);assert.equal(JSON.stringify(p.control.source).includes('second'),false);await p.dispose(c.session);
});
test('accepted session faults are admitted after its source attempt has finished',async()=>{
 const p=unitPlayer(),c=await candidate(p);accept(p,c.attempt);assert.equal(p.control.source.candidate,null);const error=Error('accepted');c.send('error',error);assert.equal(c.session.error,error);assert.equal(p.control.source.acceptedFault,p.control.source.faultSerial);await p.dispose(c.session);
});
test('mpv file failures retain message coercion and update the same fault authority',async()=>{
 const p=unitPlayer(),c=await candidate(p);c.send('mpv',{event:'end-file',reason:'error',file_error:'decode stopped'});assert.equal(c.session.error.message,'decode stopped');assert.equal(p.control.source.candidate.fault,1);await p.dispose(c.session);
});
test('error coercion that retires its source cannot install an obsolete fault',async()=>{
 const p=unitPlayer(),c=await candidate(p);c.send('error',{toString(){p.dispatchControl({type:'source.clear'});return 'retired';}});assert.equal(c.session.error,undefined);assert.equal(p.control.source.faultSerial,0);await p.dispose(c.session);
});
test('cleared, disposed and replaced sessions cannot revive a fault identity',async()=>{
 const p=unitPlayer(),old=await candidate(p);old.send('error',Error('old'));accept(p,old.attempt);const next=await candidate(p);accept(p,next.attempt);const serial=p.control.source.faultSerial;old.send('error',Error('stale'));assert.equal(old.session.error,undefined);assert.equal(next.session.error,undefined);assert.equal(p.control.source.faultSerial,serial);await p.dispose(next.session);next.send('error',Error('disposed'));assert.equal(p.control.source.faultSerial,serial);p.dispatchControl({type:'source.clear'});assert.equal(p.control.source.acceptedFault,null);await p.dispose(old.session);
});
test('long actual session history bounds pure fault metadata to current owners',async()=>{
 const p=unitPlayer();for(let i=0;i<1100;i++){const c=await candidate(p);c.send('error',Error(String(i)));assert.equal(p.control.source.candidate.fault,i+1);p.dispatchControl({type:'source.clear'});await p.dispose(c.session);assert.equal(p.control.source.candidate,null);assert.equal(p.control.source.acceptedFault,null);assert.equal(Object.keys(p.control.source).length,10);}assert.equal(p.control.source.faultSerial,1100);
});
test('reentrant fault dispatch observes its physical Error and cannot overwrite a newer fault',async()=>{
 const p=unitPlayer(),c=await candidate(p),outer=Error('outer'),inner=Error('inner'),dispatch=p.dispatchControl.bind(p);let nested=false;
 p.dispatchControl=input=>{const result=dispatch(input);if(input.type==='source.fault'&&!nested){nested=true;assert.equal(c.session.error,outer);p.recordSessionFault(c.session,inner);assert.equal(c.session.error,inner);}return result;};
 c.send('error',outer);assert.equal(c.session.error,inner);assert.equal(p.control.source.faultSerial,2);assert.equal(p.sessionFaultErrors.get(c.session).id,2);await p.dispose(c.session);
});
test('reentrant retirement during fault dispatch cannot attach its Error to a replacement owner',async()=>{
 const p=unitPlayer(),c=await candidate(p),dispatch=p.dispatchControl.bind(p);p.dispatchControl=input=>{const result=dispatch(input);if(input.type==='source.fault')dispatch({type:'source.clear'});return result;};c.send('error',Error('old'));assert.equal(c.session.error,undefined);assert.equal(p.sessionFaultErrors.has(c.session),false);await p.dispose(c.session);
});
test('fault serial exhaustion rejects without replacing the last physical Error',async()=>{
 const p=unitPlayer(),c=await candidate(p),first=Error('retained');c.send('error',first);p.control={...p.control,source:{...p.control.source,faultSerial:Number.MAX_SAFE_INTEGER}};c.send('error',Error('overflow'));assert.equal(c.session.error,first);assert.equal(p.control.source.faultSerial,Number.MAX_SAFE_INTEGER);assert.equal(p.control.source.candidate.fault,1);await p.dispose(c.session);
});
test('cancelled command preserves asynchronous faults from its still-accepted backend',async()=>{
 const p=unitPlayer(),c=await candidate(p);accept(p,c.attempt);const operation=p.dispatchControl({type:'operation.admit',kind:'seeking'}).id;p.dispatchControl({type:'operation.start',id:operation});p.dispatchControl({type:'operation.cancel',id:operation});const failure=Error('backend failed during cancelled seek');await Promise.resolve();c.send('error',failure);assert.equal(c.session.error,failure);assert.equal(p.control.source.acceptedFault,1);p.dispatchControl({type:'operation.release',id:operation});await p.dispose(c.session);
});
test('cancelled candidate operation still rejects asynchronous candidate faults',async()=>{
 const p=unitPlayer(),operation=p.dispatchControl({type:'operation.admit',kind:'opening'}).id;p.dispatchControl({type:'operation.start',id:operation});const c=await candidate(p);p.dispatchControl({type:'operation.cancel',id:operation});await Promise.resolve();c.send('error',Error('retired candidate'));assert.equal(c.session.error,undefined);assert.equal(p.control.source.faultSerial,0);p.dispatchControl({type:'operation.release',id:operation});await p.dispose(c.session);
});
