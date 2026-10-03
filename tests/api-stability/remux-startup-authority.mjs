// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {RemuxPlayer} from '../../web/native-remux-player.js';
function fixture(t,onTarget){
 const originals=new Map();const install=(name,value)=>{originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
 install('location',{origin:'null'});install('MediaSource',class{});install('Worker',class{postMessage(){}terminate(){}});
 install('MessageChannel',class{port1={close(){}};port2={close(){}};});
 const video={pause(){},load(){},removeAttribute(){},currentTime:0},player=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi',attachMedia(){}});clearInterval(player.timer);player.stopWorkers=()=>{};player.watchWorker=()=>{};player.hasStartupCoverage=()=>true;
 player.waitForStartup=async(stage,generation,subscribe)=>{
  if(stage==='sourceopen')return;
  if(stage==='source-init')return{size:8,identity:{}};
  onTarget(player,generation);
  return new Promise((resolve,reject)=>{const cleanup=subscribe(error=>error?reject(error):resolve());cleanup?.();});
 };
 t.after(()=>{player.destroy();for(const[name,value]of originals)value?Object.defineProperty(globalThis,name,value):delete globalThis[name];});return player;
}
test('retained diagnostic errors cannot reject a healthy remux startup',async t=>{
 const player=fixture(t,p=>{p.stats.errors=['historical diagnostic'];});const session=await player.open({file:{}});assert.equal(session.generation,player.generation);assert.equal(player.lifecycle.acceptedGeneration,player.generation);
});
test('cleared diagnostic errors cannot hide a failed remux generation or replace its cause',async t=>{
 const error=Error('physical failure'),player=fixture(t,(p,generation)=>{p.transitionLifecycle({type:'failure',generation,message:error.message,playing:false});p.failureError=error;p.stats.errors=[];});await assert.rejects(player.open({file:{}}),value=>value===error);
});
test('startup authority does not access mutable diagnostic error arrays',async t=>{
 const player=fixture(t,p=>{Object.defineProperty(p.stats,'errors',{get(){throw Error('diagnostic array read');}});});await player.open({file:{}});assert.equal(player.lifecycle.acceptedGeneration,player.generation);
});
