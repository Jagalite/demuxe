// SPDX-License-Identifier: Apache-2.0
import type {PlaybackMode,TrackTypePolicy} from '../../types.js';
import type {PlayerControlState} from './state.js';
import type {PlaybackSettings} from './settings.js';
import {changePreferences} from './settings.js';
import {trackSelectionRejection,type PolicyTrack} from './track-policy.js';
export type AttachmentKind='subtitle'|'font'|'text';
export type AttachmentEntry=Readonly<{id:string;kind:AttachmentKind;bytes:number;sourceId:number|null}>;
export type AttachmentCommand=
  |Readonly<{kind:'add';entry:AttachmentEntry;select:boolean}>
  |Readonly<{kind:'remove';id:string;handleKind:string;sourceId:number|null;authentic:boolean;selected:boolean}>;
export type AttachmentFacts=Readonly<{sourceId:number|null;session:number|null;hasSource:boolean;hasBackend:boolean;surfaceLocked:boolean;nativeASS:boolean;plan:string|undefined;policy?:TrackTypePolicy;track?:PolicyTrack}>;
type AttachmentRoute='none'|'select'|'replace'|'text';
export type AttachmentTransaction=Readonly<{id:number;operation:number;epoch:number;session:number|null;phase:'reading'|'applying'|'accepted';entries:readonly AttachmentEntry[];added?:string;clearSelection:boolean;settingsPatch:Readonly<Partial<PlaybackSettings>>;route:AttachmentRoute}>;
export type AttachmentState=Readonly<{serial:number;requestSerial:number;entries:readonly AttachmentEntry[];pending:AttachmentTransaction|null}>;
export function initialAttachments():AttachmentState{return Object.freeze({serial:0,requestSerial:0,entries:Object.freeze([]),pending:null});}
export type AttachmentInput=
  |Readonly<{type:'attachment.allocate';kind:AttachmentKind;file?:Readonly<{valid:boolean;format:string;size:number}>}>
  |Readonly<{type:'attachment.begin';command:AttachmentCommand;facts:AttachmentFacts}>
  |Readonly<{type:'attachment.ready';id:number;bytes:number}>
  |Readonly<{type:'attachment.complete'|'attachment.failed';id:number}>;
export type AttachmentEffect=
  |Readonly<{kind:'attachment.read'|'attachment.text';attachmentId:string}>
  |Readonly<{kind:'attachment.select'|'attachment.replace';settings:Readonly<PlaybackSettings>;mode:PlaybackMode}>;
export function attachmentAuthority(state:PlayerControlState,id:number):boolean{
  const pending=state.attachments.pending,operation=state.operations.entries.find(entry=>entry.id===state.operations.active);
  return !!pending&&pending.id===id&&!state.operations.terminal&&pending.epoch===state.operations.epoch&&pending.session===state.source.acceptedSession&&operation?.id===pending.operation&&!operation.cancelled&&operation.phase==='active';
}
/** Pending membership is only used to configure a hidden candidate. Accepted
 * membership and selection stay unchanged until the same atomic commit. */
export function candidateAttachments(state:PlayerControlState):readonly AttachmentEntry[]{const pending=state.attachments.pending;return pending?.phase==='applying'?pending.entries:state.attachments.entries;}
export function attachmentPreferences(state:PlayerControlState){const pending=state.attachments.pending;if(pending?.phase!=='applying'||!pending.clearSelection)return state.preferences;const {sub:_,...publicSelections}=state.preferences.publicSelections;return changePreferences(state.preferences,{publicSelections});}
function effects(state:PlayerControlState,pending:AttachmentTransaction):readonly AttachmentEffect[]{
  if(pending.phase==='reading')return Object.freeze([{kind:'attachment.read',attachmentId:pending.added!}]);
  if(pending.route==='none')return Object.freeze([]);
  if(pending.route==='text')return Object.freeze([{kind:'attachment.text',attachmentId:pending.added!}]);
  return Object.freeze([Object.freeze({kind:pending.route==='select'?'attachment.select':'attachment.replace',settings:Object.freeze({...state.settings,...pending.settingsPatch}),mode:state.source.mode})]);
}
function budget(entries:readonly AttachmentEntry[],kind:AttachmentKind,bytes:number):string|undefined{
  const owned=entries.filter(entry=>entry.kind===kind);
  if(kind==='text')return owned.length>=16?'At most 16 browser text attachments are supported':undefined;
  return owned.length>=16||owned.reduce((n,entry)=>n+entry.bytes,0)+bytes>(kind==='font'?32:16)*1024*1024?kind==='font'?'Font budget exceeded':'Subtitle budget exceeded':undefined;
}
export function transitionAttachment(state:PlayerControlState,input:AttachmentInput){
  const result=(next:PlayerControlState,accepted:boolean,id?:number,effects:readonly AttachmentEffect[]=Object.freeze([]),message?:string,reason='retired')=>Object.freeze({state:next===state?state:Object.freeze({...next,revision:state.revision+1}),accepted,id,effects,message,reason:accepted?undefined:reason,retire:Object.freeze([]) as readonly number[]});
  if(input.type==='attachment.allocate'){
    const id=state.attachments.serial+1,next={...state,attachments:Object.freeze({...state.attachments,serial:id})},file=input.file;
    const message=input.kind==='text'?undefined:!file?.valid&&input.kind==='subtitle'?'Expected a subtitle File':!file?.valid||!Number.isSafeInteger(file.size)||file.size<0||file.size>8*1024*1024||!(input.kind==='font'?['ttf','otf']:['ass','ssa','srt','vtt']).includes(file.format)?input.kind==='font'?'Expected a TTF/OTF font up to 8 MiB':'Expected an SRT, ASS, SSA or WebVTT file up to 8 MiB':undefined;
    return result(next,!message,id,undefined,message,'invalid');
  }
  if(input.type==='attachment.begin'){
    const operation=state.operations.entries.find(entry=>entry.id===state.operations.active),facts=input.facts,command=input.command;
    if(state.operations.terminal||!operation||operation.cancelled||operation.epoch!==state.operations.epoch||state.attachments.pending||state.settingsTransactions.pending)return result(state,false);
    if(facts.session!==state.source.acceptedSession||facts.sourceId!==(state.source.acceptedSession===null?null:state.source.serial))return result(state,false);
    let entries:readonly AttachmentEntry[]=state.attachments.entries,clearSelection=false,settingsPatch:Partial<PlaybackSettings>={},route:AttachmentRoute='none',added:string|undefined;
    if(command.kind==='add'){
      const entry=command.entry;
      if(entries.some(item=>item.id===entry.id)||entry.sourceId!==(entry.kind==='font'?null:facts.sourceId))return result(state,false,undefined,undefined,'Invalid attachment identity','invalid');
      if(entry.kind==='subtitle'&&!facts.hasSource)return result(state,false,undefined,undefined,'Open a movie before adding subtitles','failed');
      if(entry.kind==='text'&&(state.source.mode!=='native'||!facts.hasBackend))return result(state,false,undefined,undefined,'External browser text tracks require an open native player','unsupported');
      if(entry.kind==='text'&&facts.surfaceLocked)return result(state,false,undefined,undefined,'Exit video Picture-in-Picture before attaching subtitles','unsupported');
      // Text count preceded host-policy validation in the public contract.
      const exceeded=budget(entries,entry.kind,entry.bytes);
      if(entry.kind==='text'&&exceeded)return result(state,false,undefined,undefined,exceeded,'invalid');
      const rejection=entry.kind!=='font'&&trackSelectionRejection(facts.policy,facts.track?.id??'external',facts.track);
      if(rejection)return result(state,false,undefined,undefined,rejection,'unsupported');
      if(exceeded)return result(state,false,undefined,undefined,exceeded,'failed');
      entries=Object.freeze([...entries,Object.freeze({...entry})]);added=entry.id;
      clearSelection=entry.kind==='subtitle'&&command.select;
      if(clearSelection)settingsPatch={sid:'auto'};
      route=entry.kind==='text'?'text':entry.kind==='subtitle'?'select':facts.hasSource&&(state.source.mode!=='native'||facts.nativeASS&&entries.some(item=>item.kind==='subtitle')||facts.plan==='remux-mpv')?'replace':'none';
    }else{
      if(!command.authentic||!['subtitle','font'].includes(command.handleKind))return result(state,false,undefined,undefined,'Invalid attachment handle','invalid');
      const entry=entries.find(item=>item.id===command.id),font=command.handleKind==='font';
      if(!entry||(font?entry.kind!=='font'||command.sourceId!==null:entry.kind==='font'||command.sourceId!==facts.sourceId))return result(state,false,undefined,undefined,font?'Expired font handle':'Expired subtitle handle','invalid');
      if(!font&&command.selected&&(facts.policy?.locked||facts.policy?.allowOff===false))return result(state,false,undefined,undefined,'Track policy prevents removing the selected subtitle','unsupported');
      entries=Object.freeze(entries.filter(item=>item.id!==command.id));clearSelection=!font&&command.selected;
      if(clearSelection)settingsPatch={sid:'no',subtitles:false};
      route=facts.hasSource?'select':'none';
    }
    const id=state.attachments.requestSerial+1,pending:AttachmentTransaction=Object.freeze({id,operation:operation.id,epoch:operation.epoch,session:state.source.acceptedSession,phase:command.kind==='add'&&command.entry.kind!=='text'?'reading':'applying',entries,added,clearSelection,settingsPatch:Object.freeze(settingsPatch),route});
    return result({...state,attachments:Object.freeze({...state.attachments,requestSerial:id,pending})},true,id,effects(state,pending));
  }
  if(!attachmentAuthority(state,input.id))return result(state,false,input.id);
  const pending=state.attachments.pending!;
  if(input.type==='attachment.failed')return result({...state,attachments:Object.freeze({...state.attachments,pending:null})},true,input.id);
  if(input.type==='attachment.ready'){
    if(pending.phase!=='reading')return result(state,false,input.id);
    const entry=pending.entries.find(item=>item.id===pending.added)!;
    if(!Number.isSafeInteger(input.bytes)||input.bytes<0||input.bytes>8*1024*1024)return result(state,false,input.id,undefined,'Invalid attachment byte size','invalid');
    const exceeded=budget(state.attachments.entries,entry.kind,input.bytes);if(exceeded)return result(state,false,input.id,undefined,exceeded,'failed');
    const next=Object.freeze({...pending,phase:'applying' as const,entries:Object.freeze(pending.entries.map(item=>item.id===entry.id?Object.freeze({...item,bytes:input.bytes}):item))});
    return result({...state,attachments:Object.freeze({...state.attachments,pending:next})},true,input.id,effects(state,next));
  }
  if(pending.phase==='reading')return result(state,false,input.id);
  const commit=pending.phase==='applying';
  return result({...state,attachments:Object.freeze({...state.attachments,entries:commit?pending.entries:state.attachments.entries,pending:null}),preferences:commit?attachmentPreferences(state):state.preferences,settings:commit?Object.freeze({...state.settings,...pending.settingsPatch}):state.settings},true,input.id);
}
