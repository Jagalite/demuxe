// SPDX-License-Identifier: Apache-2.0
export type StageTap = Readonly<{id:number;x:number;y:number;at:number;side:-1|0|1;source:number}>;
export type StageTaps = Readonly<{press?:StageTap;previous?:StageTap;seeking?:boolean}>;
export type StageTapCommand = Readonly<{type:'cancel'}>|Readonly<{type:'down'|'move'|'up';tap:StageTap;eligible:boolean}>;
/** Recognize double taps, then continue seeking on each tap in the same burst. */
export function transitionStageTaps(state:StageTaps,command:StageTapCommand):Readonly<{state:StageTaps;seek?:-1|1}>{
 if(command.type==='cancel'||!command.eligible)return {state:{}};
 const tap=command.tap,press=state.press;
 if(command.type==='down')return {state:press?{}:{press:tap,previous:state.previous?.source===tap.source?state.previous:undefined,seeking:state.seeking}};
 if(!press||press.id!==tap.id)return {state};
 if(press.source!==tap.source||Math.hypot(press.x-tap.x,press.y-tap.y)>20)return {state:{}};
 if(command.type==='move')return {state};
 if(tap.at-press.at>350||tap.at<press.at||tap.side!==press.side||!tap.side)return {state:{}};
 const previous=state.previous;
 if(previous&&previous.side===tap.side&&tap.at-previous.at>=0&&tap.at-previous.at<=(state.seeking?1000:350)&&Math.hypot(previous.x-tap.x,previous.y-tap.y)<=48)return {state:{previous:tap,seeking:true},seek:tap.side};
 return {state:{previous:tap}};
}
