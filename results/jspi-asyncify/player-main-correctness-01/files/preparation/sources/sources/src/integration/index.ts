// SPDX-License-Identifier: Apache-2.0
import {Player} from '../unified-player.js';
import {PlayerError,playerError} from '../internal/errors.js';
import type {PlaybackRuntime,StateSource} from '../contracts.js';
import type {PlayerOptions,PlayerState,SessionError} from '../types.js';
export type {PlaybackControl,PlaybackRuntime,StateSource,PlayerAPI} from '../contracts.js';
/** Initial delivery and Object.is equality by default. Observer failures are isolated. */
export function subscribeSelector<T>(source:StateSource,select:(state:PlayerState)=>T,listener:(value:T)=>void,equal:(a:T,b:T)=>boolean=Object.is):()=>void {
  let active=true,initialized=false,value:T;
  const unsubscribe=source.subscribe(state=>{
    if(!active)return;
    try {const next=select(state);if(initialized&&equal(value,next))return;value=next;initialized=true;listener(next);} catch { /* Observers never affect playback. */ }
  });
  return ()=>{if(!active)return;active=false;unsubscribe();};
}
export type BindingError = Readonly<{origin:'integration';sourceId:number|null;error:SessionError}>;
export type BindingOptions = {onOperationError?:(error:BindingError)=>void};
/** Application owns sources. Disposal never cancels accepted or unrelated core work. */
export class PlaybackBinding {
  readonly sourceAuthority='application' as const;
  private active=true;
  private cleanup?:Promise<void>;
  private listeners=new Set<()=>void>();
  private notifications=0;
  constructor(private runtime:PlaybackRuntime,readonly ownership:'owned'|'borrowed',private options:BindingOptions={}) {
    if(runtime.isDestroyed)throw new PlayerError('ABORTED','Cannot bind a destroyed runtime');
  }
  get state(){return this.runtime.state;}
  get disposed(){return !this.active;}
  get diagnostics(){return Object.freeze({origin:'integration' as const,subscriptions:this.listeners.size,notifications:this.notifications});}
  subscribe(listener:(state:PlayerState)=>void){
    this.assertActive();let live=true;const release=this.runtime.subscribe(state=>{if(this.active&&live){this.notifications++;try{listener(state);}catch{}}});
    const stop=()=>{if(!live)return;live=false;release();this.listeners.delete(stop);};
    this.listeners.add(stop);if(!this.active)stop();return stop;
  }
  private assertActive(){if(!this.active||this.runtime.isDestroyed)throw new PlayerError('ABORTED','Binding is disposed or runtime is destroyed');}
  /** Invoke immediately, preserving browser activation. Retain canonical completion. */
  run<T>(operation:()=>Promise<T>):Promise<T>{
    const sourceId=this.runtime.state.sourceId;
    try {this.assertActive();return Promise.resolve(operation()).catch(error=>{throw this.report(error,sourceId);});}
    catch(error){return Promise.reject(this.report(error,sourceId));}
  }
  private report(error:unknown,sourceId:number|null){const safe=playerError(error);if(this.active)try{this.options.onOperationError?.(Object.freeze({origin:'integration',sourceId,error:Object.freeze(safe.toJSON())}));}catch{}return safe;}
  play(){return this.run(()=>this.runtime.play());}
  pause(){return this.run(()=>this.runtime.pause());}
  seek(time:number){return this.run(()=>this.runtime.seek(time));}
  setVolume(value:number){return this.run(()=>this.runtime.setVolume(value));}
  setMuted(value:boolean){return this.run(()=>this.runtime.setMuted(value));}
  setPlaybackRate(value:number){return this.run(()=>this.runtime.setPlaybackRate(value));}
  dispose():Promise<void>{
    if(this.cleanup)return this.cleanup;this.active=false;
    for(const stop of [...this.listeners])stop();
    let resolve!:()=>void,reject!:(error:unknown)=>void;this.cleanup=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    try{if(this.ownership==='owned')Promise.resolve(this.runtime.destroy()).then(resolve,reject);else resolve();}catch(error){reject(error);}return this.cleanup;
  }
}
export function bindPlayer(player:PlaybackRuntime,options:BindingOptions={}){return new PlaybackBinding(player,'borrowed',options);}
export function createPlayerBinding(container:HTMLElement,options:PlayerOptions={},bindingOptions:BindingOptions={}) {
  const player=new Player(container,options);return {player,binding:new PlaybackBinding(player,'owned',bindingOptions)};
}
