// SPDX-License-Identifier: Apache-2.0
import type {PlayerState,PreparationProgress,MediaTrack,TrackTypePolicy} from '../../types.js';
import type {ElementQueueState} from './element-queue.js';
export type ElementViewState=Readonly<{sourceName:string;sourceId:number|null;dimensions:string;trackSignature:string;queueSignature:string;queueRenderSignature:string}>;
export function initialElementView():ElementViewState {return Object.freeze({sourceName:'',sourceId:null,dimensions:'',trackSignature:'',queueSignature:'',queueRenderSignature:''});}
export type ElementViewCommand=
 | Readonly<{type:'source';name:string;sourceId:number|null}>
 | Readonly<{type:'observe-source';sourceId:number|null}>
 | Readonly<{type:'reset-owner'}>
 | Readonly<{type:'geometry';ratio:number|null|undefined;pending:boolean;width:number;height:number}>
 | Readonly<{type:'tracks';audio:PlayerState['audioTracks'];subtitles:PlayerState['subtitleTracks'];policy:PlayerState['trackPolicy']}>
 | Readonly<{type:'queue';queue:ElementQueueState;pending:boolean;sourceControls:boolean;labels:Readonly<Record<string,string>>}>;
export type ElementViewDecision=Readonly<{state:ElementViewState;changed?:boolean;rebuild?:boolean;resize?:Readonly<{width:number;height:number}>;clearAspect?:boolean;aspect?:number}>;
export function transitionElementView(state:ElementViewState,command:ElementViewCommand):ElementViewDecision {
 switch(command.type){
  case 'source':return Object.freeze({state:Object.freeze({...state,sourceName:command.name,sourceId:command.sourceId}),changed:true});
  case 'observe-source':return state.sourceId!==command.sourceId?Object.freeze({state:Object.freeze({...state,sourceName:'',sourceId:null}),changed:true}):Object.freeze({state,changed:false});
  case 'reset-owner':return Object.freeze({state:Object.freeze({...state,dimensions:'',trackSignature:''})});
  case 'geometry':{
   if(!command.ratio)return Object.freeze({state,clearAspect:true});
   const key=`${command.width}x${command.height}`,changed=!command.pending&&state.dimensions!==key;
   return Object.freeze({state:changed?Object.freeze({...state,dimensions:key}):state,aspect:command.ratio,resize:changed?Object.freeze({width:command.width,height:command.height}):undefined});
  }
  case 'tracks':{
   const signature=JSON.stringify([command.audio,command.subtitles,command.policy]);
   return state.trackSignature===signature?Object.freeze({state,changed:false}):Object.freeze({state:Object.freeze({...state,trackSignature:signature}),changed:true});
  }
  case 'queue':{
   const {queue,labels}=command,busy=queue.operation!==null||command.pending;
   const rendered=JSON.stringify([queue.revision,queue.index,busy,command.sourceControls,labels.queue,labels.clearQueue,labels.previous,labels.next,labels.remove,labels.unnamed,labels.open,labels.addFiles]);
   if(state.queueRenderSignature===rendered)return Object.freeze({state,changed:false,rebuild:false});
   const signature=JSON.stringify([queue.revision,labels.remove,labels.unnamed]);
   return Object.freeze({state:Object.freeze({...state,queueRenderSignature:rendered,queueSignature:signature}),changed:true,rebuild:signature!==state.queueSignature});
  }
 }
}
export function elementTitle(state:ElementViewState,facts:Readonly<{mode:string;title:string;terminal:boolean;connected:boolean;hasSource:boolean;loadedLabel:string;emptyLabel:string}>){
 const title=facts.mode==='none'?'':facts.mode==='custom'?facts.title:facts.mode==='source'?state.sourceName:facts.title||state.sourceName;
 return Object.freeze({title,source:state.sourceName||(!facts.terminal&&facts.connected&&facts.hasSource?facts.loadedLabel:facts.emptyLabel)});
}
export function elementTrackOptions(list:readonly MediaTrack[],policy:TrackTypePolicy|undefined,labels:Readonly<{automatic:string;off:string}>){
 const selected=list.find(track=>track.selected)?.id;
 return Object.freeze({options:Object.freeze([
  ...(policy?.allowAuto!==false?[Object.freeze({label:labels.automatic,id:'auto'})]:[]),
  ...(policy?.allowOff!==false?[Object.freeze({label:labels.off,id:''})]:[]),
  ...list.map(track=>Object.freeze({label:track.label,id:track.id})),
 ]),value:selected??(policy?.allowOff!==false?'':list.length?'':'auto'),disabled:!!policy?.locked||!list.length});
}
export function elementActivity(state:PlayerState,preparation:readonly PreparationProgress[],openingStage:string,labels:Readonly<Record<string,string>>){
 const preparing=preparation.filter(asset=>['queued','loading','compiling'].includes(asset.status)),ready=preparation.filter(asset=>asset.status==='ready').length;
 const names={inspector:'media inspector',hybrid:'Hybrid',software:'Software',font:'subtitle font'},phase=preparing.find(asset=>asset.status==='compiling')??preparing[0];
 const preparationText=phase?`${phase.status==='compiling'?'Compiling':'Loading'} ${names[phase.name]}… · ${ready}/${preparation.length} ready`:preparation.length?ready===preparation.length?`Components ready · ${ready}/${preparation.length}`:`Ready · ${ready}/${preparation.length} prepared; others load when needed`:'';
 const activity=state.pendingOperation?.kind==='opening'?(phase?preparationText:openingStage||labels.loading):state.pendingOperation?.kind==='switching'?labels.switching:state.pendingOperation?.kind==='seeking'?labels.seeking:state.streaming?.recovery?.status==='retrying'?labels.recovering:state.status==='buffering'?labels.buffering:'';
 const pill=activity||(!state.sourceId?preparationText:'');
 return Object.freeze({activity,pill,complete:!activity&&!phase,description:preparation.length&&!activity?preparation.map(asset=>`${names[asset.name]}: ${asset.status}`).join('; '):pill,announcement:pill||(state.streamType==='live'&&!state.seekable?.length?labels.noWindow:'')});
}
