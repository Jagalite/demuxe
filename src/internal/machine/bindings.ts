// SPDX-License-Identifier: Apache-2.0
import type {PlayerState} from '../../types.js';

export type BindingState=Readonly<{
  ownership:'owned'|'borrowed';disposed:boolean;nextSubscription:number;
  subscriptions:readonly number[];notifications:number;
}>;
export type BindingCommand=
  | Readonly<{type:'run'|'subscribe';runtimeDestroyed:boolean}>
  | Readonly<{type:'notify'|'unsubscribe';id:number}>
  | Readonly<{type:'dispose'}>;
export type BindingDecision=Readonly<{
  state:BindingState;subscriptionId?:number;deliver?:boolean;release?:readonly number[];destroyRuntime?:boolean;
  error?:Readonly<{code:'ABORTED';message:string}>;
}>;
export function initialBindingState(ownership:'owned'|'borrowed'):BindingState {
  return Object.freeze({ownership,disposed:false,nextSubscription:1,subscriptions:Object.freeze([]),notifications:0});
}
export function bindingSubscriptionActive(state:BindingState,id:number):boolean{return !state.disposed&&state.subscriptions.includes(id);}
export function transitionBinding(state:BindingState,command:BindingCommand):BindingDecision {
  switch(command.type){
    case 'run':case 'subscribe':{
      if(state.disposed||command.runtimeDestroyed)return Object.freeze({state,error:Object.freeze({code:'ABORTED',message:'Binding is disposed or runtime is destroyed'})});
      if(command.type==='run')return Object.freeze({state});
      const id=state.nextSubscription;
      return Object.freeze({state:Object.freeze({...state,nextSubscription:id+1,subscriptions:Object.freeze([...state.subscriptions,id])}),subscriptionId:id});
    }
    case 'notify':return bindingSubscriptionActive(state,command.id)
      ?Object.freeze({state:Object.freeze({...state,notifications:state.notifications+1}),deliver:true})
      :Object.freeze({state,deliver:false});
    case 'unsubscribe':return state.subscriptions.includes(command.id)
      ?Object.freeze({state:Object.freeze({...state,subscriptions:Object.freeze(state.subscriptions.filter(id=>id!==command.id))}),release:Object.freeze([command.id])})
      :Object.freeze({state,release:Object.freeze([])});
    case 'dispose':return state.disposed?Object.freeze({state,release:Object.freeze([]),destroyRuntime:false})
      :Object.freeze({state:Object.freeze({...state,disposed:true,subscriptions:Object.freeze([])}),release:state.subscriptions,destroyRuntime:state.ownership==='owned'});
  }
}
export function bindingDiagnostics(state:BindingState){return Object.freeze({origin:'integration' as const,subscriptions:state.subscriptions.length,notifications:state.notifications});}

export type SelectorState=Readonly<{active:boolean;initialized:boolean}>;
export function initialSelectorState():SelectorState{return Object.freeze({active:true,initialized:false});}
/** Selection/equality callbacks are application effects. Only their sampled
 * equality and the observer lifetime participate in the delivery decision. */
export function transitionSelector(state:SelectorState,command:Readonly<{type:'stop'}|{type:'observe';equal:boolean}>){
  if(command.type==='stop')return Object.freeze({state:Object.freeze({...state,active:false}),deliver:false});
  if(!state.active||state.initialized&&command.equal)return Object.freeze({state,deliver:false});
  return Object.freeze({state:Object.freeze({...state,initialized:true}),deliver:true});
}

export type MediaViewEvent=Readonly<{type:string;detail?:PlayerState['error']}>;
export type MediaViewState=Readonly<{previous:PlayerState|null}>;
export function initialMediaViewState():MediaViewState{return Object.freeze({previous:null});}
/** Player snapshots are immutable data. The shell fences each dispatched event
 * against reentrant source replacement and never infers seek settlement. */
export function transitionMediaView(state:MediaViewState,next:PlayerState){
  const before=state.previous,events:MediaViewEvent[]=[];
  if(before){
    const duration=(value:PlayerState)=>value.streamType==='live'?Infinity:value.duration??NaN;
    if(before.sourceId!==next.sourceId)events.push({type:next.sourceId===null?'emptied':'loadedmetadata'});
    for(const [type,a,b]of [['durationchange',duration(before),duration(next)],['timeupdate',before.currentTime,next.currentTime],['volumechange',`${before.volume}:${before.muted}`,`${next.volume}:${next.muted}`],['ratechange',before.playbackRate,next.playbackRate]] as const)if(!Object.is(a,b))events.push({type});
    if(before.playbackIntent!==next.playbackIntent)events.push({type:next.playbackIntent==='play'?'play':'pause'});
    if(before.status!==next.status&&['playing','buffering','ended'].includes(next.status)&&!(next.status==='ended'&&next.loop))events.push({type:next.status==='buffering'?'waiting':next.status});
    if(next.error?.scope==='session'&&before.error!==next.error)events.push({type:'error',detail:next.error});
  }
  return Object.freeze({state:Object.freeze({previous:next}),events:Object.freeze(events.map(event=>Object.freeze({...event})))});
}
export function initialMediaViewEvents(state:PlayerState):readonly string[]{return Object.freeze([state.sourceId===null?'emptied':'loadedmetadata','durationchange','timeupdate','volumechange','ratechange',state.playbackIntent==='pause'?'pause':'play']);}
