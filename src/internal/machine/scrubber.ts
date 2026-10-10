// SPDX-License-Identifier: Apache-2.0
import type {PreviewStrategyData} from '../../types.js';
export type ScrubberTarget=Readonly<{owner:number;time:number}>;
export type ScrubberState=Readonly<{
 terminal:boolean;hover:number;serial:number;nextResource:number;nextPresentation:number;
 sourceId:number|null;eligible:boolean;intent:ScrubberTarget|null;
 pending:ScrubberTarget|null;generation:Readonly<{id:number}&ScrubberTarget>|null;
 presentation:Readonly<{id:number;image:number}>|null;displayedImage:number|null;visible:boolean;
}>;
export type ScrubberCommand=
 | Readonly<{type:'allocate'|'generate'|'clear'|'hide'|'destroy'}>
 | Readonly<{type:'hover';target?:ScrubberTarget}>
 | Readonly<{type:'observe';sourceId:number|null;eligible:boolean}>
 | Readonly<{type:'cache';hover:number;target:ScrubberTarget;hit:boolean;refine:boolean;defer?:boolean}>
 | Readonly<{type:'generated';id:number;aborted:boolean;hasFrame:boolean}>
 | Readonly<{type:'generation-finished';id:number}>
 | Readonly<{type:'show';image:number}>
 | Readonly<{type:'decoded'|'presented'|'presentation-finished'|'presentation-failed'|'deadline';id:number}>;
export type ScrubberDecision=Readonly<{
 state:ScrubberState;accepted?:boolean;id?:number;placeholder?:boolean;show?:boolean;clear?:boolean;
 generate?:Readonly<{id:number}&ScrubberTarget>;presentation?:Readonly<{id:number;needsImage:boolean}>;
 abortGeneration?:number;abortPresentation?:number;retry?:ScrubberTarget;
}>;
export function initialScrubber():ScrubberState {return Object.freeze({sourceId:null,eligible:true,intent:null,terminal:false,hover:0,serial:0,nextResource:1,nextPresentation:1,pending:null,generation:null,presentation:null,displayedImage:null,visible:false});}
function clear(state:ScrubberState):ScrubberDecision {
 return Object.freeze({state:Object.freeze({...state,presentation:null,displayedImage:null,visible:false}),accepted:true,clear:true,abortPresentation:state.presentation?.id});
}
export function transitionScrubber(state:ScrubberState,command:ScrubberCommand):ScrubberDecision {
 if(command.type==='allocate'){const id=state.nextResource;return Object.freeze({state:Object.freeze({...state,nextResource:id+1}),id});}
 if(command.type==='hide'||command.type==='destroy'){
  const result=clear(state);
  return Object.freeze({...result,state:Object.freeze({...result.state,terminal:state.terminal||command.type==='destroy',hover:state.hover+1,serial:state.serial+1,pending:null,generation:null,intent:null}),abortGeneration:state.generation?.id});
 }
 if(state.terminal)return Object.freeze({state,accepted:false});
 switch(command.type){
  case 'observe':{
   if(command.sourceId===state.sourceId&&command.eligible===state.eligible)return Object.freeze({state,accepted:false});
   const replaced=command.sourceId!==state.sourceId;
   if(replaced||!command.eligible){
    const result=clear(state);
    return Object.freeze({...result,state:Object.freeze({...result.state,sourceId:command.sourceId,eligible:command.eligible,intent:replaced?null:state.intent,hover:state.hover+1,serial:state.serial+1,pending:null,generation:null}),abortGeneration:state.generation?.id});
   }
   // Retry on the eligibility edge only. A cache miss must not form a retry loop.
   const hover=state.hover+1;
   return Object.freeze({state:Object.freeze({...state,eligible:true,hover}),accepted:true,id:hover,retry:state.intent??undefined});
  }
  case 'hover':return Object.freeze({state:Object.freeze({...state,hover:state.hover+1,visible:true,intent:command.target?Object.freeze({...command.target}):state.intent}),id:state.hover+1,placeholder:!state.visible});
  case 'cache':{
   if(command.hover!==state.hover)return Object.freeze({state,accepted:false});
   const pending=state.eligible&&!command.defer&&(!command.hit||command.refine)?Object.freeze({...command.target}):null;
   return Object.freeze({state:Object.freeze({...state,serial:state.serial+(command.hit?1:0),pending}),accepted:true,show:command.hit});
  }
  case 'generate':{
   if(!state.eligible||state.generation||!state.pending)return Object.freeze({state,accepted:false});
   const generation=Object.freeze({...state.pending,id:state.serial+1});
   return Object.freeze({state:Object.freeze({...state,serial:generation.id,generation,pending:null}),accepted:true,generate:generation});
  }
  case 'generated':return command.aborted||state.generation?.id!==command.id||state.serial!==command.id?Object.freeze({state,accepted:false}):Object.freeze({state,accepted:true,show:command.hasFrame,clear:!command.hasFrame});
  case 'generation-finished':return state.generation?.id===command.id?Object.freeze({state:Object.freeze({...state,generation:null}),accepted:true}):Object.freeze({state,accepted:false});
  case 'show':{
   if(state.presentation?.image===command.image)return Object.freeze({state,accepted:false});
   const id=state.nextPresentation;
   return Object.freeze({state:Object.freeze({...state,nextPresentation:id+1,presentation:Object.freeze({id,image:command.image})}),accepted:true,presentation:Object.freeze({id,needsImage:state.displayedImage!==command.image}),abortPresentation:state.presentation?.id});
  }
  case 'clear':return clear(state);
  case 'decoded':return state.presentation?.id===command.id?Object.freeze({state:Object.freeze({...state,displayedImage:state.presentation.image}),accepted:true}):Object.freeze({state,accepted:false});
  case 'presented':return state.presentation?.id===command.id?Object.freeze({state:Object.freeze({...state,visible:true}),accepted:true}):Object.freeze({state,accepted:false});
  case 'presentation-finished':return state.presentation?.id===command.id?Object.freeze({state:Object.freeze({...state,presentation:null}),accepted:true}):Object.freeze({state,accepted:false});
  case 'presentation-failed':case 'deadline':return state.presentation?.id===command.id?clear(state):Object.freeze({state,accepted:false});
 }
}
export function scrubberDistance(strategy:PreviewStrategyData|null|undefined,span:number,generation=false):number {
 if(strategy?.type==='demuxe')return generation?0:span;
 if(generation&&strategy?.type==='adaptive')return (strategy.every??5)/2+1;
 if(strategy?.type==='interval')return (strategy.every??5)*(strategy.unit==='minutes'?60:1)/2+1;
 if(strategy?.type==='adaptive'||strategy?.type==='uniform')return span/(2*(strategy.samples??(strategy.type==='adaptive'?24:48)))+1;
 return strategy?1:span/96+1;
}
export function scrubberPointer(facts:Readonly<{touch:boolean;disabled:boolean;left:number;width:number;thumbWidth?:number;step?:number;min:number;max:number;x:number;parentLeft:number;parentWidth:number}>):Readonly<{hide:boolean;time?:number;left?:number}>{
 if(facts.touch||facts.disabled)return Object.freeze({hide:true});
 if(!facts.width||facts.max<=facts.min)return Object.freeze({hide:false});
 // Native range values follow the thumb's centre, whose travel excludes its width.
 const thumb=Math.max(0,Math.min(facts.width,facts.thumbWidth??0)),travel=facts.width-thumb;
 if(travel<=0)return Object.freeze({hide:false});
 const fraction=Math.max(0,Math.min(1,(facts.x-facts.left-thumb/2)/travel)),half=Math.min(120,facts.parentWidth/2),span=facts.max-facts.min;
 const step=facts.step??0,offset=step>0?Math.min(Math.round(fraction*span/step),Math.floor(span/step+1e-9))*step:fraction*span;
 const time=Number((facts.min+offset).toPrecision(12));
 return Object.freeze({hide:false,time,left:Math.max(half,Math.min(facts.parentWidth-half,facts.x-facts.parentLeft))});
}
