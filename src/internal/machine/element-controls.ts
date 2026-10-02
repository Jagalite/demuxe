// SPDX-License-Identifier: Apache-2.0
import type {SessionError} from '../../types.js';
export type ElementControlsState=Readonly<{
 idle:boolean;seekPreview:boolean;playing:boolean;seeking:boolean;dragging:boolean;stageWasIdle:boolean;
 menuOpen:boolean;menuTrigger:'open-menu'|'settings-toggle';diagnostics:boolean;diagnosticsUpdated:number;
 openingOperation:number|null;openingStage:string;previewIdentity:string;announcement:string;failure:SessionError|undefined;
}>;
export type ElementControlFacts=Readonly<{playing:boolean;pending:boolean;connected:boolean;focusVisible:boolean}>;
export type ElementControlsCommand=
 | Readonly<{type:'reveal';playing:boolean;delay:number}>
 | Readonly<{type:'hide'}>
 | Readonly<{type:'hide-elapsed'}&ElementControlFacts>
 | Readonly<{type:'pointer-leave';mouse:boolean;terminal:boolean;controls:boolean;hasSource:boolean}&ElementControlFacts>
 | Readonly<{type:'screen-press'}>
 | Readonly<{type:'drag';active:boolean}>
 | Readonly<{type:'menu';open:boolean;trigger:'open-menu'|'settings-toggle';sourceControls:boolean}>
 | Readonly<{type:'preview';identity:string;pending:boolean;controls:boolean;seekable:boolean}>
 | Readonly<{type:'seeking';seeking:boolean}>
 | Readonly<{type:'seek-preview-expired'}>
 | Readonly<{type:'playing';playing:boolean;intent:'play'|'pause';status:string}>
 | Readonly<{type:'opening';operation:number|null;initialStage:string}>
 | Readonly<{type:'opening-stage';stage:string}>
 | Readonly<{type:'diagnostics';show:boolean;enabled:boolean;controls:boolean}>
 | Readonly<{type:'diagnostics-sample';now:number;force:boolean;hasOwner:boolean}>
 | Readonly<{type:'announce';text:string}>
 | Readonly<{type:'error';error:SessionError}>
 | Readonly<{type:'clear-error'}>;
export type ElementControlsDecision=Readonly<{state:ElementControlsState;accepted?:boolean;changed?:boolean;hideAfter?:number;reveal?:boolean;seekPreviewAfter?:number;resetPreview?:boolean}>;
export function initialElementControls():ElementControlsState {
 return Object.freeze({idle:false,seekPreview:false,playing:false,seeking:false,dragging:false,stageWasIdle:false,menuOpen:false,menuTrigger:'settings-toggle',diagnostics:false,diagnosticsUpdated:0,openingOperation:null,openingStage:'',previewIdentity:'',announcement:'',failure:undefined});
}
function canHide(state:ElementControlsState,facts:ElementControlFacts):boolean {return facts.playing&&!facts.pending&&!state.menuOpen&&!state.dragging&&!facts.focusVisible&&facts.connected;}
export function transitionElementControls(state:ElementControlsState,command:ElementControlsCommand):ElementControlsDecision {
 switch(command.type){
  case 'reveal':return Object.freeze({state:Object.freeze({...state,idle:false,seekPreview:false}),hideAfter:command.playing&&command.delay>0?command.delay:undefined});
  case 'hide':return Object.freeze({state:Object.freeze({...state,idle:true,seekPreview:false}),accepted:true});
  case 'hide-elapsed':return Object.freeze({state,accepted:canHide(state,command)});
  case 'pointer-leave':return Object.freeze({state,accepted:command.mouse&&!command.terminal&&command.controls&&command.hasSource&&canHide(state,command)});
  case 'screen-press':return Object.freeze({state:Object.freeze({...state,stageWasIdle:state.idle})});
  case 'drag':return Object.freeze({state:Object.freeze({...state,dragging:command.active})});
  case 'menu':return command.open&&command.trigger==='open-menu'&&!command.sourceControls?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,menuOpen:command.open,menuTrigger:command.open?command.trigger:state.menuTrigger}),accepted:true});
  case 'preview':{
   const resetPreview=command.identity!==state.previewIdentity||command.pending||!command.controls||!command.seekable;
   return Object.freeze({state:resetPreview?Object.freeze({...state,dragging:false,previewIdentity:command.identity}):state,resetPreview});
  }
  case 'seeking':{
   if(state.seeking===command.seeking)return Object.freeze({state,changed:false});
   return Object.freeze({state:Object.freeze({...state,seeking:command.seeking,seekPreview:state.idle?true:state.seekPreview}),changed:true,reveal:!state.idle,seekPreviewAfter:state.idle&&!command.seeking?800:undefined});
  }
  case 'seek-preview-expired':return Object.freeze({state:Object.freeze({...state,seekPreview:false})});
  case 'playing':return state.playing===command.playing?Object.freeze({state,changed:false}):Object.freeze({state:Object.freeze({...state,playing:command.playing}),changed:true,reveal:!state.idle||command.intent==='pause'||['ended','error','idle'].includes(command.status)});
  case 'opening':return Object.freeze({state:command.operation===null?Object.freeze({...state,openingOperation:null,openingStage:''}):command.operation!==state.openingOperation?Object.freeze({...state,openingOperation:command.operation,openingStage:command.initialStage}):state});
  case 'opening-stage':return Object.freeze({state:Object.freeze({...state,openingStage:command.stage})});
  case 'diagnostics':return Object.freeze({state:Object.freeze({...state,diagnostics:command.show&&command.enabled&&command.controls})});
  case 'diagnostics-sample':{
   const accepted=state.diagnostics&&command.hasOwner&&(command.force||command.now-state.diagnosticsUpdated>=500);
   return Object.freeze({state:accepted?Object.freeze({...state,diagnosticsUpdated:command.now}):state,accepted});
  }
  case 'announce':return Object.freeze({state:command.text===state.announcement?state:Object.freeze({...state,announcement:command.text}),changed:command.text!==state.announcement});
  case 'error':return command.error.code==='ABORTED'?Object.freeze({state,accepted:false}):Object.freeze({state:Object.freeze({...state,failure:Object.freeze({...command.error})}),accepted:true});
  case 'clear-error':return Object.freeze({state:Object.freeze({...state,failure:undefined})});
 }
}
