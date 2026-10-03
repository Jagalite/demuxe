// SPDX-License-Identifier: Apache-2.0
/** Logical authority shared by the two packaged legacy native workers. */
export interface LegacyPlaybackWorkerState {
  readonly demuxFormat:string;readonly seekPreroll:number;readonly decoderOutputWatchdog:boolean; readonly snapshot:Readonly<{id:number;source:number;capturing:boolean}>|null; readonly gpuPauseIntent:boolean|null; readonly sourceRendered:number; readonly source: number; readonly opening: boolean; readonly ready: boolean; readonly initialized: boolean; readonly closing: boolean; readonly pumpFailed: boolean;
  readonly force: boolean; readonly paused: boolean; readonly busyUntil: number;
  readonly pendingTarget: number | null; readonly restarted: boolean; readonly position: number;
  readonly nextDiagnostics: number; readonly commandSerial: number; readonly commands: readonly Readonly<{id:number;source:number}>[];
  readonly timerSerial: number; readonly timer: number | null;
}
export const initialLegacyPlaybackWorker = (): LegacyPlaybackWorkerState => ({demuxFormat:'',seekPreroll:0,decoderOutputWatchdog:true,snapshot:null,gpuPauseIntent:null,sourceRendered:0,source:0,opening:false,ready:false,initialized:false,closing:false,pumpFailed:false,force:true,paused:true,busyUntil:0,pendingTarget:null,restarted:false,position:0,nextDiagnostics:0,commandSerial:0x80000000,commands:[],timerSerial:0,timer:null});
export type LegacyPlaybackWorkerEvent =
 | {type:'format';format:string;software:boolean}|{type:'decoder-watchdog';enabled:boolean}| {type:'gpu-lost'} | {type:'gpu-intent';paused:boolean} | {type:'gpu-restored'} | {type:'frame-presented'} | {type:'ready'} | {type:'init'} | {type:'close'} | {type:'fail'} | {type:'invalidate'} | {type:'rendered'}
 | {type:'touch'; now:number} | {type:'pause'; paused:boolean; now:number}
 | {type:'seek'; target:number} | {type:'position'; position:number} | {type:'restart'} | {type:'seek-released'}
 | {type:'diagnostics'; now:number};
export function reduceLegacyPlaybackWorker(s:LegacyPlaybackWorkerState,e:LegacyPlaybackWorkerEvent):LegacyPlaybackWorkerState {
 if(s.closing)return s;
 switch(e.type){
 case 'format':return {...s,demuxFormat:e.format,seekPreroll:e.software?1:e.format==='mpegts'?30:/^(mkv|matroska(?:,|$))/.test(e.format)?0.5:0};
 case 'decoder-watchdog':return {...s,decoderOutputWatchdog:e.enabled};
 case 'gpu-lost':return {...s,gpuPauseIntent:s.paused};
 case 'gpu-intent':return {...s,gpuPauseIntent:e.paused};
 case 'gpu-restored':return {...s,gpuPauseIntent:null};
 case 'frame-presented':return {...s,sourceRendered:Math.min(6,s.sourceRendered+1)};
 case 'ready':return s.initialized?{...s,ready:true}:s;
 case 'init':return s.initialized?s:{...s,initialized:true};
 case 'close':return {...s,closing:true,opening:false,commands:[],timer:null};
 case 'fail':return {...s,pumpFailed:true,commands:[],timer:null};
 case 'invalidate':return {...s,force:true};
 case 'rendered':return {...s,force:false};
 case 'touch':return {...s,busyUntil:e.now+300};
 case 'pause':return {...s,paused:e.paused,busyUntil:e.now+300};
 case 'seek':return Number.isFinite(e.target)?{...s,pendingTarget:e.target,restarted:false,sourceRendered:0}:s;
 case 'position':return Number.isFinite(e.position)?{...s,position:e.position}:s;
 case 'restart':return {...s,restarted:true};
 case 'seek-released':return legacySeekComplete(s)?{...s,pendingTarget:null,force:true}:s;
 case 'diagnostics':return {...s,nextDiagnostics:e.now+200};
 }
}
export function legacySeekComplete(s:LegacyPlaybackWorkerState):boolean{return !s.closing&&s.pendingTarget!==null&&s.restarted&&Math.abs(s.position-s.pendingTarget)<.15;}
export function legacyPumpDelay(s:LegacyPlaybackWorkerState,now:number,extraWork=false,activeDelay=5):number{return s.paused&&s.pendingTarget===null&&!extraWork&&now>=s.busyUntil?100:activeDelay;}
export function admitLegacyCommand(s:LegacyPlaybackWorkerState):{state:LegacyPlaybackWorkerState;id:number|null}{
 if(s.closing||s.pumpFailed||s.commands.length>=128||s.commandSerial>=0xffffffff)return {state:s,id:null};
 const id=s.commandSerial;return {state:{...s,commandSerial:id+1,commands:[...s.commands,{id,source:s.source}]},id};
}
export function finishLegacyCommand(s:LegacyPlaybackWorkerState,id:number):LegacyPlaybackWorkerState{return s.commands.some(value=>value.id===id)?{...s,commands:s.commands.filter(value=>value.id!==id)}:s;}
export function armLegacyPump(s:LegacyPlaybackWorkerState):{state:LegacyPlaybackWorkerState;id:number|null}{
 if(s.closing||s.pumpFailed||s.timerSerial>=Number.MAX_SAFE_INTEGER)return {state:s,id:null};
 const id=s.timerSerial+1;return {state:{...s,timerSerial:id,timer:id},id};
}
export function takeLegacyPump(s:LegacyPlaybackWorkerState,id:number):LegacyPlaybackWorkerState{return s.timer===id?{...s,timer:null}:s;}

export function admitLegacySource(s:LegacyPlaybackWorkerState):{state:LegacyPlaybackWorkerState;id:number|null}{
 if(!s.ready||s.closing||s.pumpFailed||s.opening||s.source>=0xffffffff)return {state:s,id:null};
 const id=s.source+1;return {state:{...s,source:id,opening:true,sourceRendered:0,snapshot:s.snapshot?.capturing?s.snapshot:null,pendingTarget:null,restarted:false,position:0},id};
}
export function finishLegacySource(s:LegacyPlaybackWorkerState,id:number):LegacyPlaybackWorkerState{return !s.closing&&s.opening&&s.source===id?{...s,opening:false}:s;}
export interface LegacyPCMState {readonly epoch:number;readonly forwarded:number;}
export const initialLegacyPCM=():LegacyPCMState=>({epoch:-1,forwarded:0});
export function planLegacyPCM(s:LegacyPCMState,epoch:number,ack:number,written:number,preserveFinalBatch=false):{state:LegacyPCMState;kind:'wait'|'reset'|'copy';count:number}{
 if(epoch&1)return {state:s,kind:'wait',count:0};
 if(s.epoch!==epoch&&preserveFinalBatch&&s.epoch>=0)return {state:s,kind:'wait',count:0};
 if(s.epoch!==epoch)return {state:{epoch,forwarded:0},kind:'reset',count:0};
 if(ack!==epoch)return {state:s,kind:'wait',count:0};
 const count=(written-s.forwarded)>>>0;
 if(count>8192)throw Error('PCM capacity invariant violated');
 return {state:s,kind:'copy',count};
}
export function commitLegacyPCM(s:LegacyPCMState,epoch:number,written:number):LegacyPCMState{return s.epoch===epoch?{...s,forwarded:written>>>0}:s;}

export function legacyCommandCurrent(s:LegacyPlaybackWorkerState,id:number):boolean{return !s.closing&&s.commands.some(command=>command.id===id&&command.source===s.source);}

export function admitLegacySnapshot(s:LegacyPlaybackWorkerState,id:number):LegacyPlaybackWorkerState{return s.ready&&!s.closing&&!s.pumpFailed&&!s.snapshot&&Number.isSafeInteger(id)?{...s,snapshot:{id,source:s.source,capturing:false},force:true}:s;}
export function captureLegacySnapshot(s:LegacyPlaybackWorkerState):LegacyPlaybackWorkerState{return s.snapshot&&!s.snapshot.capturing&&!s.closing?{...s,snapshot:{...s.snapshot,capturing:true}}:s;}
export function finishLegacySnapshot(s:LegacyPlaybackWorkerState,id:number,source:number):{state:LegacyPlaybackWorkerState;publish:boolean}{return s.snapshot?.id===id&&s.snapshot.source===source?{state:{...s,snapshot:null},publish:!s.closing&&s.source===source}:{state:s,publish:false};}
