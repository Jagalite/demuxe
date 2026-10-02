// SPDX-License-Identifier: Apache-2.0
import type {NativeControlRequest} from './native-controls.js';
export type NativeCaptionEffect=NativeCaptionRequest|NativeControlRequest;
export type NativeCaptionKind='browser-file'|'browser-url'|'overlay';
export type NativeCaptionRequest=Readonly<{id:number;epoch:number;kind:'caption'}>;
type Attachment=Readonly<{request:NativeCaptionRequest;kind:NativeCaptionKind;attachmentId:string|undefined;phase:'pending'|'accepted';deadline:number|null;index:number|null;publicId:string|null}>;
export type NativeCaptions=Readonly<{visible:boolean;selected:string;revision:number;selectionSerial:number;nextIndex:number;effect:NativeCaptionEffect|null;queued:readonly NativeCaptionEffect[];attachments:readonly Attachment[]}>;
export function initialNativeCaptions():NativeCaptions{return Object.freeze({visible:true,selected:'auto',revision:0,selectionSerial:0,nextIndex:1,effect:null,queued:Object.freeze([]),attachments:Object.freeze([])});}
export function nativeCaptionCurrent(state:NativeCaptions,request:NativeCaptionRequest):boolean{return state.attachments.some(item=>item.request.id===request.id&&item.request.epoch===request.epoch);}
export function nativeCaptionAttachment(state:NativeCaptions,id:number):Attachment|undefined{return state.attachments.find(item=>item.request.id===id);}
export function beginNativeCaption(state:NativeCaptions,request:NativeCaptionRequest,kind:NativeCaptionKind,attachmentId:string|undefined,now:number):NativeCaptions{return Object.freeze({...state,attachments:Object.freeze([...state.attachments,Object.freeze({request:Object.freeze({...request}),kind,attachmentId,phase:'pending' as const,deadline:kind==='overlay'?null:now+15000,index:null,publicId:null})])});}
export function acceptNativeCaption(state:NativeCaptions,request:NativeCaptionRequest,publicId:string|null,select:boolean):NativeCaptions{
 const entry=nativeCaptionAttachment(state,request.id);if(!entry||!nativeCaptionCurrent(state,request)||entry.phase!=='pending')return state;
 const index=entry.kind==='browser-file'?state.nextIndex:null;
 return Object.freeze({...state,nextIndex:index===null?state.nextIndex:index+1,attachments:Object.freeze(state.attachments.map(item=>item!==entry?item:Object.freeze({...entry,phase:'accepted' as const,index,publicId:index===null?publicId:String(200000+index)}))),...entry.kind==='overlay'&&select&&publicId!==null&&nativeCaptionMaySelect(state,request)?{selected:publicId,revision:state.revision+1,selectionSerial:request.id}:{}});
}
export function finishNativeCaption(state:NativeCaptions,request:NativeCaptionRequest):NativeCaptions{const entry=nativeCaptionAttachment(state,request.id);return !entry||entry.phase==='accepted'||!nativeCaptionCurrent(state,request)?state:Object.freeze({...state,attachments:Object.freeze(state.attachments.filter(item=>item!==entry))});}
export function retireNativeCaptions(state:NativeCaptions):NativeCaptions{return Object.freeze({...state,revision:state.revision+1,nextIndex:1,effect:null,queued:Object.freeze([]),attachments:Object.freeze([])});}
export function updateNativeCaptionSelection(state:NativeCaptions,change:Readonly<{selected?:string;visible?:boolean}>):NativeCaptions{return Object.freeze({...state,revision:state.revision+1,...change.selected===undefined?{}:{selected:change.selected},...change.visible===undefined?{}:{visible:change.visible}});}
export function nativeCaptionRemaining(state:NativeCaptions,request:NativeCaptionRequest,now:number):number|undefined{const item=nativeCaptionAttachment(state,request.id);return item?.phase==='pending'&&item.deadline!==null&&nativeCaptionCurrent(state,request)?Math.max(0,item.deadline-now):undefined;}
export function selectNativeCaptionPresentation(state:NativeCaptions,facts:Readonly<{overlaySelected:boolean;preferredIndex:number|null;tracks:readonly Readonly<{id:string;caption:boolean}>[]}>):Readonly<{overlay:boolean;modes:readonly ('showing'|'disabled')[]}>{
 const autoIndex=facts.preferredIndex??facts.tracks.findIndex(track=>!track.caption);
 return Object.freeze({overlay:state.visible&&state.selected!=='no'&&facts.overlaySelected,modes:Object.freeze(facts.tracks.map((track,index)=>state.visible&&!facts.overlaySelected&&state.selected!=='no'&&(state.selected==='auto'?index===autoIndex:track.id===state.selected)?'showing':'disabled'))});
}
export function nativeOverlayAdmission(facts:Readonly<{adapted:boolean;adaptation:string|undefined;enabled:boolean;format:string}>):string|undefined{return facts.adapted&&facts.adaptation==='opus'?'Native Opus plus external subtitles is not qualified':!facts.enabled||!['ass','ssa','srt','vtt'].includes(facts.format)?'Native external subtitles require explicit experimental admission':undefined;}
export type NativeCaptionCue=Readonly<{start:number;end:number;text:string}>;
export function nativeCaptionFidelity(expected:readonly NativeCaptionCue[],actual:readonly NativeCaptionCue[],bias:number):boolean{return actual.length===expected.length&&actual.every((cue,index)=>!(Math.abs(cue.start-bias-expected[index].start)>1e-6||Math.abs(cue.end-bias-expected[index].end)>1e-6||cue.text!==expected[index].text));}

export function removeNativeCaption(state:NativeCaptions,request:NativeCaptionRequest):NativeCaptions{return nativeCaptionCurrent(state,request)?Object.freeze({...state,attachments:Object.freeze(state.attachments.filter(item=>item.request.id!==request.id))}):state;}

export function nativeCaptionMaySelect(state:NativeCaptions,request:NativeCaptionRequest):boolean{return nativeCaptionCurrent(state,request)&&state.selectionSerial<=request.id;}
export function beginNativeCaptionSelection(state:NativeCaptions,id:number):NativeCaptions{return Object.freeze({...state,selectionSerial:id});}
export function queueNativeCaptionEffect(state:NativeCaptions,request:NativeCaptionEffect,currentIds:readonly number[]):Readonly<{state:NativeCaptions;start?:NativeCaptionEffect}>{
 if(state.effect?.id===request.id||state.queued.some(item=>item.id===request.id))return Object.freeze({state});
 const queued=state.queued.filter(item=>currentIds.includes(item.id)),owned=Object.freeze({...request});
 return state.effect?Object.freeze({state:Object.freeze({...state,queued:Object.freeze([...queued,owned])})}):Object.freeze({state:Object.freeze({...state,effect:owned,queued:Object.freeze(queued)}),start:owned});
}
export function finishNativeCaptionEffect(state:NativeCaptions,request:NativeCaptionEffect,currentIds:readonly number[]):Readonly<{state:NativeCaptions;start?:NativeCaptionEffect}>{
 if(state.effect?.id!==request.id||state.effect.epoch!==request.epoch)return Object.freeze({state});
 const queued=state.queued.filter(item=>currentIds.includes(item.id)),start=queued[0];
 return Object.freeze({state:Object.freeze({...state,effect:start??null,queued:Object.freeze(queued.slice(1))}),...start?{start}:{}});
}
