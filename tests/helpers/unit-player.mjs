// SPDX-License-Identifier: Apache-2.0
import {Player} from '../../web/generated/unified-player.js';

// Construct the real class (including private fields) while replacing only the
// DOM/presentation boundary. Operation scheduling remains the production code.
export function unitPlayer() {
 const names=['HTMLElement','HTMLCanvasElement','HTMLVideoElement','document'];
 const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const document=new EventTarget();document.baseURI='http://localhost/';
 class Element {ownerDocument=document;append(){}remove(){}}
 class UnitPlayer extends Player {publish(){}startWatchdogs(){}stopWatchdogs(){}schedulePromotion(){}}
 document.createElement=()=>new Element();
 try {
  Object.assign(globalThis,{HTMLElement:Element,HTMLCanvasElement:class extends Element{},HTMLVideoElement:class extends Element{},document});
  return new UnitPlayer(new Element(),{assetBase:'http://localhost/',preview:false,watchdogs:false});
 }finally{for(const [name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}
