// SPDX-License-Identifier: Apache-2.0
/** Accepted values only. Desired transaction values remain detached until the
 * source/settings acceptance transition commits them together. */
export type PlaybackSettings={pause:boolean;volume:number;speed:number;aid:string;sid:string;subtitles:boolean;vf:string;af:string;gain:number};
export type SettingsInput=Readonly<{type:'settings.accept';value:Readonly<PlaybackSettings>}>|Readonly<{type:'settings.change';value:Readonly<Partial<PlaybackSettings>>}>;
export function initialSettings():Readonly<PlaybackSettings>{return Object.freeze({pause:true,volume:100,speed:1,aid:'auto',sid:'auto',subtitles:true,vf:'',af:'',gain:1});}
export function transitionSettings(state:Readonly<PlaybackSettings>,input:SettingsInput):Readonly<PlaybackSettings>{return Object.freeze(input.type==='settings.accept'?{...input.value}:{...state,...input.value});}
