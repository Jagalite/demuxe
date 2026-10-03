// SPDX-License-Identifier: Apache-2.0
import {MediaView,MEDIA_VIEW_EVENTS,timeRanges} from '../integration/media-view.js';
import type {PlaybackRuntime} from '../contracts.js';
import {PlayerError} from '../internal/errors.js';
import {initialMediaElementBinding,transitionMediaElementBinding,mediaElementBindingCurrent} from '../internal/machine/element-lifecycle.js';
const Base=(typeof HTMLElement==='undefined'?class {}:HTMLElement) as typeof HTMLElement;
/** Explicitly borrowed, application-owned sources. No automatic registration or playback. */
export class DemuxeMediaElement extends Base {
  private bindingState=initialMediaElementBinding();
  private view?:MediaView;
  private cleanup=Promise.resolve();
  private stops:(()=>void)[]=[];
  bind(player:PlaybackRuntime){
    const bound=transitionMediaElementBinding(this.bindingState,{type:'bind'});this.bindingState=bound.state;
    if(!bound.accepted)throw new PlayerError('INVALID_ARGUMENT','Dispose the previous binding before rebinding');
    const generation=bound.state.generation;let view:MediaView|undefined;
    const current=()=>mediaElementBindingCurrent(this.bindingState,generation);
    const check=()=>{if(!current())throw new PlayerError('ABORTED','Media element binding was retired');};
    try {
      view=new MediaView(player);
      if(!current()){void view.dispose().catch(()=>{});check();}
      this.view=view;
      for(const name of MEDIA_VIEW_EVENTS){
        const target=view,listener=(event:Event)=>{if(current())this.dispatchEvent(new CustomEvent(name,{detail:(event as CustomEvent).detail}));};
        const stop=()=>target.removeEventListener(name,listener);this.stops.push(stop);
        try{target.addEventListener(name,listener);}catch(error){try{stop();}catch{}throw error;}
        if(!current())try{stop();}catch{}
        check();
      }
      view.synchronize();check();
    }catch(error){if(current())void this.dispose().catch(()=>{});throw error;}
    return this;
  }
  get state(){return this.view?.state??null;}
  get paused(){return this.view?.paused??true;}
  get ended(){return this.view?.ended??false;}
  get currentTime(){return this.view?.currentTime??0;}
  set currentTime(value:number){this.requireView().currentTime=value;}
  get duration(){return this.view?.duration??NaN;}
  get volume(){return this.view?.volume??1;}
  set volume(value:number){this.requireView().volume=value;}
  get muted(){return this.view?.muted??false;}
  set muted(value:boolean){this.requireView().muted=value;}
  get playbackRate(){return this.view?.playbackRate??1;}
  set playbackRate(value:number){this.requireView().playbackRate=value;}
  get seeking(){return this.view?.seeking??false;}
  get buffered(){return this.view?.buffered??timeRanges(null);}
  get seekable(){return this.view?.seekable??timeRanges(null);}
  get error(){return this.view?.error??null;}
  // Deliberately never reflect application sources, signed URLs or internal object URLs.
  get currentSrc(){return '';}
  get src(){return '';}
  set src(_value:string){throw new PlayerError('UNSUPPORTED_FEATURE','Sources are application-owned; call Player.open');}
  play(){try{return this.requireView().play();}catch(error){return Promise.reject(error);}}
  pause(){this.requireView().pause();}
  private requireView(){if(!this.bindingState.bound||!this.view)throw new PlayerError('ABORTED','Media element is not bound');return this.view;}
  dispose(){
    if(!this.bindingState.bound)return this.cleanup;
    let resolve!:()=>void,reject!:(error:unknown)=>void;
    const done=this.cleanup=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    this.bindingState=transitionMediaElementBinding(this.bindingState,{type:'dispose'}).state;
    const view=this.view,stops=this.stops.splice(0);this.view=undefined;
    const errors:unknown[]=[];
    for(const stop of stops)try{stop();}catch(error){errors.push(error);}
    let release:Promise<void>|undefined;try{release=view?.dispose();}catch(error){errors.push(error);}
    Promise.resolve(release).catch(error=>{errors.push(error);}).then(()=>{if(errors.length)reject(errors.length===1?errors[0]:new AggregateError(errors,'Media element cleanup failed'));else resolve();});
    return done;
  }
  disconnectedCallback(){this.bindingState=transitionMediaElementBinding(this.bindingState,{type:'disconnect'}).state;const connection=this.bindingState.connection;queueMicrotask(()=>{if(transitionMediaElementBinding(this.bindingState,{type:'disconnect-ready',connection,connected:this.isConnected}).accepted)void this.dispose();});}
}
export function registerMediaElement(name='demuxe-media'){
  if(typeof customElements==='undefined')throw new PlayerError('INVALID_ARGUMENT','Registration requires a browser');
  const existing=customElements.get(name);if(existing&&existing!==DemuxeMediaElement)throw new PlayerError('INVALID_ARGUMENT','Custom element name is already registered');
  if(!existing)customElements.define(name,DemuxeMediaElement);
}
