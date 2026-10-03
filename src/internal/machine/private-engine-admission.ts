// SPDX-License-Identifier: Apache-2.0
export type PrivateRuntime='jspi'|'asyncify';
export type PrivateProfile='subtitles'|'audio'|'playback';
const controls=['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'];
export function privateRuntimeError(runtime:string,jspi:boolean,profile?:string):string|null{
 if(!['jspi','asyncify'].includes(runtime)||profile!==undefined&&!['subtitles','audio','playback'].includes(profile))return profile===undefined?'Invalid private remux runtime':'Invalid private mpv runtime';
 return runtime==='jspi'&&!jspi?(profile===undefined?'Selected JSPI runtime is unavailable':'Selected JSPI runtime unavailable'):null;
}
export function privateManifestError(runtime:string,profile:string,facts:Readonly<{schema:unknown;backend:unknown;profile:unknown}>):string|null{return facts.schema!==1||facts.backend!==runtime||facts.profile!==profile?'Private mpv asset identity mismatch':null;}
export function privateMpvAbiError(runtime:string,profile:string,names:readonly string[],retained:boolean,declared:unknown):string|null{
 if(declared!==undefined&&typeof declared!=='boolean')return 'Invalid private retained decoder identity';
 if(retained!==!!declared)return 'Private retained decoder identity mismatch';
 if(runtime==='asyncify'?!controls.every(name=>names.includes(name)):controls.some(name=>names.includes(name)))return 'Private mpv backend mismatch';
 return ['demuxe_coop_invoke','demuxe_source_live',...(profile==='playback'?['web_create','web_render','web_event','web_command_args','web_destroy','web_audio_ptr']:[profile==='audio'?'private_audio_create':'subtitle_service_create'])].some(name=>!names.includes(name))?'Private mpv ABI mismatch':null;
}
export function privateRemuxAbiError(runtime:string,names:readonly string[]):string|null{
 if(runtime==='asyncify'?!controls.every(name=>names.includes(name)):controls.some(name=>names.includes(name)))return 'Wasm backend asset mismatch';
 return ['rm_probe','rm_open','rm_start','rm_step','rm_close'].some(name=>!names.includes(name))?'Wasm ABI mismatch':null;
}
export function privateAudioCapacityValid(capacity:unknown,declared:unknown):boolean{return (capacity===8192||capacity===32768)&&capacity===(declared??8192);}
export type PrivateSourceLifetime=Readonly<{phase:'idle'|'opening'|'ready'|'closed';serial:number;size:number|null}>;
export function initialPrivateSourceLifetime():PrivateSourceLifetime{return Object.freeze({phase:'idle',serial:0,size:null});}
export function beginPrivateSourceOpen(state:PrivateSourceLifetime):Readonly<{state:PrivateSourceLifetime;id:number|null}>{if(state.phase==='closed'||!Number.isSafeInteger(state.serial+1))return Object.freeze({state,id:null});const id=state.serial+1;return Object.freeze({state:Object.freeze({...state,phase:'opening',serial:id,size:null}),id});}
export function privateSourceCurrent(state:PrivateSourceLifetime,id:number):boolean{return state.phase!=='closed'&&state.serial===id;}
export function acceptPrivateSourceOpen(state:PrivateSourceLifetime,id:number,size:number):Readonly<{state:PrivateSourceLifetime;accepted:boolean;invalid:boolean}>{const current=privateSourceCurrent(state,id)&&state.phase==='opening',invalid=current&&(!Number.isSafeInteger(size)||size<=0);return Object.freeze({state:current&&!invalid?Object.freeze({...state,phase:'ready',size}):state,accepted:current&&!invalid,invalid});}
export function closePrivateSourceLifetime(state:PrivateSourceLifetime):PrivateSourceLifetime{return state.phase==='closed'?state:Object.freeze({...state,phase:'closed',size:null});}
