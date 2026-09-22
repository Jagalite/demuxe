// SPDX-License-Identifier: GPL-3.0-or-later
import {Player} from '../unified-player.js';
import {PLAYER_EVENTS} from '../types.js';
import {normalizeTrackPolicy} from '../internal/track-policy.js';
import type {TrackPolicy,TrackTypePolicy} from '../types.js';
import type {PreviewOptions, MediaSourceInput, OpenOptions, PlayerState, MediaTrack, SessionError, SubtitleOptions} from '../types.js';
import {PlayerError, playerError} from '../internal/errors.js';
import {formatTime, outputDimensions, shortcut} from './interaction.js';
import {ScrubberPreview} from './preview.js';
import {styles} from './styles.js';
// Mirror only the arrow so both directions retain upright, centered numerals.
const seekArrow = '<path d="M10 5h2a8 8 0 1 1-8 8M13 2l-3 3 3 3"/>';
const seekSeconds = '<text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="8.5" font-weight="450" font-family="system-ui,sans-serif">10</text>';
const icons = {
  previous:'<path d="M5 5v14m14-14L8 12l11 7Z" fill="currentColor"/>',
  next:'<path d="M19 5v14M5 5l11 7-11 7Z" fill="currentColor"/>',
  eyeOff:'<path d="m3 3 18 18M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4.1M6.1 6.1A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.1-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  back:`${seekArrow}${seekSeconds}`,
  forward:`<g transform="translate(24 0) scale(-1 1)">${seekArrow}</g>${seekSeconds}`,
  play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  volume:'<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings:'<path d="M9 3h6l.6 2.3 2 1.2 2.3-.6 3 5.2-1.7 1.7v2.4l1.7 1.7-3 5.2-2.3-.6-2 1.2L15 24H9l-.6-2.3-2-1.2-2.3.6-3-5.2 1.7-1.7v-2.4L1.1 11l3-5.2 2.3.6 2-1.2Z" transform="translate(1 0) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',
  folder:'<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  folderOpen:'<path d="M3 8V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v2M3 8h17a1 1 0 0 1 1 1l-2 10H3L1 9a1 1 0 0 1 1-1Z"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>'
} as const;
const Base = (typeof HTMLElement==='undefined'?class {}:HTMLElement) as typeof HTMLElement;
export const defaultLabels = Object.freeze({previews:'Timeline thumbnails',diagnostics:'Session diagnostics',moreOptions:'More options',back:'Seek backward 10 seconds',forward:'Seek forward 10 seconds',play:'Play',pause:'Pause',mute:'Mute',unmute:'Unmute',seek:'Playback position',volume:'Volume',settings:'Playback settings',closeSettings:'Close settings',speed:'Playback speed',audio:'Audio',subtitles:'Subtitles',automatic:'Automatic',off:'Off',fullscreen:'Fullscreen',exitFullscreen:'Exit fullscreen',open:'Open media',addSubtitle:'Add subtitles',empty:'Something good to watch?',drop:'Open a video or audio file from your device.',loading:'Opening media…',switching:'Updating playback…',seeking:'Seeking…',buffering:'Buffering…',live:'LIVE',unknown:'Unknown duration',retry:'Retry',resume:'Press Play to continue',shortcuts:'K / Space: play · ← → / J L: seek · ↑ ↓: volume · M: mute · C: subtitles · [ ]: speed · 0–9 / Home / End: position · F: fullscreen',noFullscreen:'Fullscreen is unavailable here. Open this page in a browser tab.',noWindow:'Live playback · seek window unavailable',openURL:'Open URL',closeMedia:'Close media',url:'Media URL',format:'Source format',streamLive:'Live stream',addFiles:'Add files',queue:'Queue',clearQueue:'Clear queue',previous:'Previous file',next:'Next file',remove:'Remove',unnamed:'Unnamed media',mediaFile:'Media file',noMedia:'No media loaded',loadedMedia:'Media loaded',subtitleFile:'Subtitle file'});
export type PlayerLabels = Partial<Record<keyof typeof defaultLabels,string>>;
export type PlayerTitleMode = 'auto' | 'custom' | 'source' | 'none';

// Never display opaque URL payloads, origins, credentials, queries or fragments.
function sourceTitle(source:MediaSourceInput):string {
  if(typeof File!=='undefined'&&source instanceof File)return source.name;
  const value=typeof source==='string'||source instanceof URL?source:
    'url' in source?source.url:undefined;
  if(value===undefined)return '';
  try {
    const url=new URL(String(value),document.baseURI);
    if(!['http:','https:','file:'].includes(url.protocol))return '';
    const filename=url.pathname.split('/').at(-1)??'';
    try{return decodeURIComponent(filename);}catch{return filename;}
  }catch{return '';}
}

type QueueItem={source:MediaSourceInput;options:OpenOptions;name:string};

export class DemuxePlayerElement extends Base {
  static observedAttributes=['no-preview','src','controls','poster','autoplay','muted','asset-base','title','title-mode'];
  private core?:Player;
  private hoverPreview!:ScrubberPreview;
  private previewIdentity='';
  private queueItems:QueueItem[]=[];
  private queueIndex=-1;
  private queueOperation?:symbol;
  private queuePlayIntent?:boolean;
  private queueSourceId:number|null=null;
  private queueEndedId:number|null=null;
  private queueSignature='';
  private queueRevision=0;
  private queueRenderSignature='';
  private queueItem(source:MediaSourceInput,options:OpenOptions={}):QueueItem {
    let name='';try{name=sourceTitle(source);}catch{}
    return {source,options:{...options,signal:undefined},name};
  }
  private resetQueue(){
    this.queueRevision++;this.queueItems=[];this.queueIndex=-1;this.queueOperation=undefined;
    this.queueSourceId=null;this.queueEndedId=null;this.renderQueue();
  }
  private async activateQueue(index:number,playAfter:boolean|(()=>boolean)=this.core?.state.playbackIntent==='play'||this.core?.state.status==='ended',options?:OpenOptions,closePreviousOnFailure=false){
    if(this.terminal)throw new PlayerError('ABORTED','Player element is destroyed');
    const item=this.queueItems[index];if(!item)return;
    const operation=this.queueOperation=Symbol();
    this.queuePlayIntent=undefined;
    this.queueIndex=index;this.queueSourceId=null;this.queueEndedId=null;this.renderQueue();
    try {
      await this.openSource(item.source,options??item.options);
      if(this.queueOperation!==operation)throw new PlayerError('ABORTED','Queue selection superseded');
      this.queueSourceId=this.core?.state.sourceId??null;
      if(this.queuePlayIntent??(typeof playAfter==='function'?playAfter():playAfter))await this.core?.play();
    }catch(error){
      // A removed item must not survive as the core's rollback source.
      if(closePreviousOnFailure&&this.queueOperation===operation&&this.queueSourceId===null)await this.core?.close();
      throw error;
    }finally{
      if(this.queueOperation===operation){this.queueOperation=undefined;this.renderQueue();queueMicrotask(()=>this.advanceQueue());}
    }
  }
  private addFiles(files:File[]){
    if(this.terminal||!files.length)return;
    const start=this.queueItems.length;
    this.queueRevision++;for(const file of files)this.queueItems.push(this.queueItem(file));
    this.settings(false,false);this.$('stage').focus({preventScroll:true});this.renderQueue();
    if(start===0)this.run(this.activateQueue(0,()=>this.autoplay));
  }
  private selectQueue(index:number){
    if(this.terminal||this.queueOperation||this.core?.state.pendingOperation)return;
    this.settings(false,false);this.$('stage').focus({preventScroll:true});
    this.run(this.activateQueue(index));
  }
  private removeQueueItem(index:number){
    if(!this.showSourceControls||this.queueOperation||this.core?.state.pendingOperation||index<0||index>=this.queueItems.length)return;
    const wasCurrent=index===this.queueIndex;
    this.queueRevision++;this.queueItems.splice(index,1);
    if(!this.queueItems.length){this.settings(false,false);this.$('stage').focus({preventScroll:true});this.run(this.close());return;}
    if(index<this.queueIndex)this.queueIndex--;
    if(wasCurrent){this.settings(false,false);this.$('stage').focus({preventScroll:true});this.run(this.activateQueue(Math.min(index,this.queueItems.length-1),undefined,undefined,true));return;}
    this.renderQueue();this.$('queue-list').querySelector<HTMLButtonElement>('button')?.focus();
  }
  private advanceQueue(){
    const state=this.core?.state;
    if(!state||this.terminal||this.queueOperation||state.pendingOperation||state.status!=='ended'||state.sourceId!==this.queueSourceId||this.queueEndedId===state.sourceId||this.queueIndex>=this.queueItems.length-1)return;
    this.queueEndedId=state.sourceId;
    this.run(this.activateQueue(this.queueIndex+1,true));
  }
  private renderQueue(){
    if(!this.shadowRoot?.getElementById('queue-list'))return;
    const busy=!!this.queueOperation||!!this.core?.state.pendingOperation,labels=this.labels;
    const renderSignature=JSON.stringify([this.queueRevision,this.queueIndex,busy,this.showSourceControls,labels.queue,labels.clearQueue,labels.previous,labels.next,labels.remove,labels.unnamed,labels.open,labels.addFiles]);
    if(renderSignature===this.queueRenderSignature)return;
    this.queueRenderSignature=renderSignature;
    this.$('queue-section').hidden=!this.queueItems.length;
    this.$('queue-navigation').hidden=this.queueItems.length<2;
    this.$('queue-count').textContent=`${this.queueIndex+1} / ${this.queueItems.length}`;
    this.$('choose-file').textContent=this.queueItems.length?this.labels.addFiles:this.labels.open;
    this.$('queue-heading').textContent=this.labels.queue;
    this.$('clear-queue').textContent=this.labels.clearQueue;
    (this.$('clear-queue') as HTMLButtonElement).disabled=!this.showSourceControls||busy;
    this.iconButton('previous-file','previous',this.labels.previous);
    this.iconButton('next-file','next',this.labels.next);
    (this.$('previous-file') as HTMLButtonElement).disabled=busy||this.queueIndex<=0;
    (this.$('next-file') as HTMLButtonElement).disabled=busy||this.queueIndex>=this.queueItems.length-1;
    const signature=JSON.stringify([this.queueRevision,labels.remove,labels.unnamed]);
    if(signature!==this.queueSignature){
      this.queueSignature=signature;this.$('queue-list').replaceChildren();
      for(const item of this.queueItems){
        const row=document.createElement('li'),choose=document.createElement('button'),remove=document.createElement('button');
        choose.type=remove.type='button';choose.className='queue-item';remove.className='queue-remove';
        choose.textContent=item.name||this.labels.unnamed;choose.title=choose.textContent;
        choose.onclick=()=>{if(this.showSourceControls)this.selectQueue(this.queueItems.indexOf(item));};
        remove.textContent='×';remove.setAttribute('aria-label',`${this.labels.remove} ${item.name||this.labels.unnamed}`);
        remove.onclick=()=>this.removeQueueItem(this.queueItems.indexOf(item));
        row.append(choose,remove);this.$('queue-list').append(row);
      }
    }
    Array.from(this.$('queue-list').children).forEach((row,index)=>{
      const choose=row.querySelector<HTMLButtonElement>('.queue-item')!;
      if(index===this.queueIndex)choose.setAttribute('aria-current','true');else choose.removeAttribute('aria-current');
      row.querySelectorAll('button').forEach(button=>button.disabled=busy||!this.showSourceControls);
    });
  }
  private sourceName='';
  private sourceNameId:number|null=null;
  private sourceControls=true;
  private diagnosticsControl=true;
  private fileDrop=true;
  private seekSeconds=10;
  private autoHideDelay=2800;
  get titleMode():PlayerTitleMode {
    const mode=this.getAttribute('title-mode');
    return mode==='custom'||mode==='source'||mode==='none'?mode:'auto';
  }
  set titleMode(value:PlayerTitleMode){
    if(!['auto','custom','source','none'].includes(value))throw new PlayerError('INVALID_ARGUMENT','Invalid titleMode');
    this.setAttribute('title-mode',value);
  }
  get showSourceControls(){return this.sourceControls;}
  set showSourceControls(value:boolean){this.sourceControls=!!value;this.updateUtilities();}
  get showDiagnostics(){return this.diagnosticsControl;}
  set showDiagnostics(value:boolean){this.diagnosticsControl=!!value;this.updateUtilities();}
  get allowFileDrop(){return this.fileDrop;}
  set allowFileDrop(value:boolean){this.fileDrop=!!value;}
  get seekStep(){return this.seekSeconds;}
  set seekStep(value:number){
    if(!Number.isFinite(value)||value<=0)throw new PlayerError('INVALID_ARGUMENT','seekStep must be a positive finite number');
    this.seekSeconds=value;this.labelControls();if(this.core)this.update(this.core.state);
  }
  get controlsAutoHideDelay(){return this.autoHideDelay;}
  set controlsAutoHideDelay(value:number){
    if(!Number.isFinite(value)||value<0||value>2147483647)throw new PlayerError('INVALID_ARGUMENT','controlsAutoHideDelay must be between 0 and 2147483647 milliseconds');
    this.autoHideDelay=value;this.revealControls();
  }
  private updateTitle(){
    const text=this.titleMode==='none'?'':this.titleMode==='custom'?this.title:
      this.titleMode==='source'?this.sourceName:this.title||this.sourceName;
    this.$('title').textContent=text;this.$('title').hidden=!text;this.updateSourceLabel();
  }
  private updateSourceLabel(){
    const text=this.sourceName||(!this.terminal&&this.isConnected&&this.core?.state.sourceId?this.labels.loadedMedia:this.labels.noMedia);
    if(this.$('current-source').textContent!==text)this.$('current-source').textContent=text;
  }
  private updateUtilities(){
    if(this.terminal)return;
    const focused=this.shadowRoot?.activeElement;
    const sourceFocused=!!focused&&(this.$('source-options').contains(focused)||this.$('open-menu')===focused||this.$('open')===focused||(!this.$('settings').hidden&&this.menuTrigger==='open-menu'&&this.$('settings').contains(focused)));
    const diagnosticsFocused=focused===this.$('diagnostics-toggle')||focused===this.$('diagnostics-overlay');
    if(!this.showSourceControls&&this.menuTrigger==='open-menu')this.settings(false,false);
    this.$('open-menu').hidden=!this.showSourceControls;
    this.$('empty').hidden=!this.showSourceControls||!!this.core?.state.sourceId;
    for(const id of ['open-menu','open','choose-file','file','subtitleFile','url','format','live','url-submit'])
      (this.$(id) as HTMLInputElement).disabled=!this.showSourceControls;
    (this.$('subtitleFile') as HTMLInputElement).disabled=!this.showSourceControls||!!this.core?.state.trackPolicy.subtitles?.locked||this.core?.state.trackPolicy.subtitles?.allowed?.length===0;
    this.$('source-options').inert=!this.showSourceControls;
    if(!this.showSourceControls)this.$('source-options').hidden=true;
    this.$('diagnostics-toggle').hidden=!this.showDiagnostics;
    (this.$('diagnostics-toggle') as HTMLButtonElement).disabled=!this.showDiagnostics;
    if(!this.showDiagnostics)this.setDiagnostics(false);
    this.renderQueue();
    if((!this.showSourceControls&&sourceFocused)||(!this.showDiagnostics&&diagnosticsFocused))this.$('stage').focus({preventScroll:true});
  }
  private terminal=false;
  private cleanup:Promise<void>=Promise.resolve();
  private connecting?:Promise<void>;
  private connection=0;
  private unsubscribe?:()=>void;
  private sourceAbort?:AbortController;
  private sourceVersion=0;
  private lastSource?:MediaSourceInput;
  private lastOptions?:OpenOptions;
  private trackConfiguration:TrackPolicy={};
  get trackPolicy(){return this.trackConfiguration;}
  set trackPolicy(value:TrackPolicy){this.trackConfiguration=normalizeTrackPolicy(value);}
  private resolveReady!:(p:Player)=>void;
  private rejectReady!:(error:Error)=>void;
  private readiness!:Promise<Player>;
  private overrides:PlayerLabels={};
  private menuTrigger='settings-toggle';
  private seekPreviewTimer?:ReturnType<typeof setTimeout>;
  private hideTimer?:ReturnType<typeof setTimeout>;
  private revealControls=()=>{this.$('shell').classList.remove('idle','seek-preview');clearTimeout(this.seekPreviewTimer);clearTimeout(this.hideTimer);if(this.core?.state.status==='playing'&&this.controlsAutoHideDelay>0)this.hideTimer=setTimeout(()=>{if(this.core?.state.status==='playing'&&!this.core.state.pendingOperation&&this.$('settings').hidden&&!this.dragging&&!this.shadowRoot?.activeElement?.matches(':focus-visible')&&this.isConnected)this.hideControls();},this.controlsAutoHideDelay);};
  private async playFromControls(){const core=this.core;await this.play();if(core===this.core&&core?.state.playbackIntent==='play'&&this.$('settings').hidden)this.hideControls(true);}
  private hideControls(focusStage=false){if(focusStage||this.shadowRoot?.activeElement)this.$('stage').focus({preventScroll:true});clearTimeout(this.hideTimer);clearTimeout(this.seekPreviewTimer);this.$('shell').classList.remove('seek-preview');this.$('shell').classList.add('idle');}
  private dismissMenu=(event:PointerEvent)=>{const path=event.composedPath();if(!this.$('settings').hidden&&!['settings','settings-toggle','open-menu'].some(id=>path.includes(this.$(id))))this.settings(false,false);};
  private stageWasIdle=false;
  private isScreenPress(event:Event){return !event.composedPath().some(node=>node instanceof Element&&node.matches('button,input,select,textarea,a,summary,[contenteditable],[role="button"],#settings,#error,#diagnostics-overlay'));}
  private wasSeeking=false;
  private openingStage='';
  private openingOperation:number|null=null;
  private diagnosticsUpdated=0;
  private dragging=false;
  private dimensions='';
  private trackSignature='';
  private reflected=false;
  private attributeScheduled=false;
  private configuredAsset:string|null=null;
  private resizeObserver?:ResizeObserver;
  private lastAnnouncement='';
  private lastFailure?:SessionError;
  private fullscreenChanged=()=>{const active=document.fullscreenElement===this;this.$('fullscreen').setAttribute('aria-pressed',String(active));this.iconButton('fullscreen',active?'collapse':'expand',active?this.labels.exitFullscreen:this.labels.fullscreen);};
  constructor(){super();this.newReady();this.attachShadow({mode:'open'});this.renderShell();this.hoverPreview=new ScrubberPreview(this.input('timeline'),this.$('thumbnail-preview'),this.$('thumbnail-image') as HTMLImageElement,this.$('thumbnail-time'),()=>this.previewThumbnails?this.core?.preview:undefined);}
  private newReady(){this.readiness=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});void this.readiness.catch(()=>{});}
  get ready(){return this.readiness;}
  get player():Player|undefined{return this.core;}
  get src(){return this.getAttribute('src')??'';} set src(value:string){if(value)this.setAttribute('src',String(value));else this.removeAttribute('src');}
  private previewConfiguration?:PreviewOptions|false;
  get previewOptions(){return this.previewConfiguration;}
  set previewOptions(value:PreviewOptions|false|undefined){if(this.core)throw new PlayerError('INVALID_ARGUMENT','previewOptions is fixed after initialization');this.previewConfiguration=value;}
  get previewThumbnails(){return !this.hasAttribute('no-preview');}
  set previewThumbnails(value:boolean){this.toggleAttribute('no-preview',!value);}
  get controls(){return this.hasAttribute('controls');} set controls(value:boolean){this.toggleAttribute('controls',!!value);}
  get autoplay(){return this.hasAttribute('autoplay');} set autoplay(value:boolean){this.toggleAttribute('autoplay',!!value);}
  get muted(){return this.hasAttribute('muted');} set muted(value:boolean){this.toggleAttribute('muted',!!value);}
  get poster(){return this.getAttribute('poster')??'';} set poster(value:string){if(value)this.setAttribute('poster',value);else this.removeAttribute('poster');}
  get assetBase(){return this.getAttribute('asset-base')??undefined;} set assetBase(value:string|undefined){if(this.core)throw new PlayerError('INVALID_ARGUMENT','assetBase is fixed after initialization');if(value)this.setAttribute('asset-base',value);else this.removeAttribute('asset-base');}
  get labels():Record<keyof typeof defaultLabels,string>{return {...defaultLabels,back:`Seek backward ${this.seekStep} seconds`,forward:`Seek forward ${this.seekStep} seconds`,...this.overrides} as Record<keyof typeof defaultLabels,string>;} set labels(value:PlayerLabels){const next:PlayerLabels={};for(const [key,text]of Object.entries(value)){if(!(key in defaultLabels)||text===undefined)continue;if(typeof text!=='string'||text.length>1024)throw new PlayerError('INVALID_ARGUMENT','Labels must be strings up to 1024 characters');next[key as keyof typeof defaultLabels]=text;}this.overrides=next;this.labelControls();if(this.core)this.update(this.core.state);}
  private $(id:string){return this.shadowRoot!.getElementById(id)!;}
  private input(id:string){return this.$(id) as HTMLInputElement;}
  connectedCallback(){
    const token=++this.connection;if(this.terminal)return;
    for(const name of ['trackPolicy','previewOptions','previewThumbnails','assetBase','labels','controls','poster','autoplay','muted','title','titleMode','showSourceControls','showDiagnostics','allowFileDrop','seekStep','controlsAutoHideDelay','src'])if(Object.prototype.hasOwnProperty.call(this,name)){const value=(this as any)[name];delete (this as any)[name];(this as any)[name]=value;}
    if(this.core)return;
    this.connecting=(async()=>{await this.cleanup;if(!this.isConnected||token!==this.connection||this.terminal)return;
      try {this.configuredAsset=this.getAttribute('asset-base');const core=this.core=new Player(this.$('surface'),{assetBase:this.assetBase,preview:this.previewConfiguration,prepare:this.getAttribute('prepare')==='all'?'all':(this.getAttribute('prepare')??'').split(/\s+/).filter(Boolean) as import('../types.js').PreparationComponent[]});this.dimensions='';this.trackSignature='';
        for(const type of [...PLAYER_EVENTS,'preparationchange','modechange','selectionchange','mpv','log','source','output'])core.addEventListener(type,event=>{
          if(this.core!==core||this.terminal)return;const detail=(event as CustomEvent).detail;
          if(type==='preparationchange')this.update(core.state);
          if(type==='modechange'&&detail.phase==='loading'&&core.state.pendingOperation?.kind==='opening'){this.openingStage=`Starting ${{native:'Native',hybrid:'Hybrid',software:'Software'}[detail.mode as 'native'|'hybrid'|'software']} playback…`;this.update(core.state);}
          if(type==='error')this.showError(detail);
          if(type==='ended')queueMicrotask(()=>{if(this.core===core)this.advanceQueue();});
          this.dispatchEvent(new CustomEvent(type,{detail}));
        });
        const initiallyMuted=this.muted;this.unsubscribe=core.subscribe(state=>this.update(state));
        if(initiallyMuted)await core.setMuted(true);
        this.resizeObserver=new ResizeObserver(()=>{if(this.core)this.geometry(this.core.state);});this.resizeObserver.observe(this.$('stage'));document.addEventListener('fullscreenchange',this.fullscreenChanged);document.addEventListener('pointerdown',this.dismissMenu,true);
        this.resolveReady(core);if(this.src)this.scheduleSource();
      } catch(error){this.rejectReady(playerError(error));this.componentError(error);}
    })();
  }
  disconnectedCallback(){const token=++this.connection;queueMicrotask(()=>{
    if(this.isConnected||token!==this.connection||this.terminal)return;
    this.hoverPreview.hide();clearTimeout(this.hideTimer);clearTimeout(this.seekPreviewTimer);this.sourceVersion++;this.sourceAbort?.abort();this.resetQueue();this.lastSource=undefined;this.lastOptions=undefined;this.sourceName='';this.sourceNameId=null;this.updateTitle();this.unsubscribe?.();this.resizeObserver?.disconnect();document.removeEventListener('fullscreenchange',this.fullscreenChanged);document.removeEventListener('pointerdown',this.dismissMenu,true);
    const old=this.core;this.core=undefined;this.rejectReady(new PlayerError('ABORTED','Player element disconnected'));this.newReady();
    this.cleanup=Promise.all([this.connecting,old?.destroy()]).then(()=>{});
  });}
  attributeChangedCallback(name:string,old:string|null,value:string|null){
    if(old===value||this.reflected||this.terminal)return;
    if(name==='no-preview'){this.input('preview-toggle').checked=this.previewThumbnails;if(!this.previewThumbnails)this.hoverPreview.hide();}
    if(name==='title'||name==='title-mode')this.updateTitle();
    if(name==='asset-base'&&this.core){this.reflected=true;if(this.configuredAsset===null)this.removeAttribute(name);else this.setAttribute(name,this.configuredAsset);this.reflected=false;this.componentError(new PlayerError('INVALID_ARGUMENT','asset-base is fixed after initialization'));return;}
    if(name==='controls'&&!this.controls){const focused=this.shadowRoot?.activeElement;const moveFocus=!!focused&&['topbar','settings','diagnostics-overlay'].some(id=>this.$(id).contains(focused));this.settings(false,false);this.setDiagnostics(false);if(moveFocus)this.$('stage').focus({preventScroll:true});}
    if(name==='src'&&this.core)this.scheduleSource();
    if(name==='muted'&&this.core)this.run(this.core.setMuted(value!==null));
    if(name==='poster'){const img=this.$('poster') as HTMLImageElement;if(value)img.src=value;else img.removeAttribute('src');}
    if(this.core)this.update(this.core.state);else {this.$('controls').hidden=!this.controls;this.$('topbar').hidden=!this.controls;}
  }
  private openFromControls(source:MediaSourceInput){this.settings(false,false);this.$('stage').focus({preventScroll:true});this.run(this.open(source));}
  private scheduleSource(){if(this.attributeScheduled)return;this.attributeScheduled=true;queueMicrotask(()=>{this.attributeScheduled=false;if(!this.core||this.terminal)return;this.run(this.src?this.open(this.src):this.close());});}
  private waitReady(signal:AbortSignal):Promise<Player>{
    if(signal.aborted)return Promise.reject(new PlayerError('ABORTED','Open aborted'));
    return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(new PlayerError('ABORTED','Open aborted'));};signal.addEventListener('abort',abort,{once:true});this.ready.then(p=>{signal.removeEventListener('abort',abort);resolve(p);},e=>{signal.removeEventListener('abort',abort);reject(e);});});
  }
  async open(source:MediaSourceInput,options:OpenOptions={}) {
    if(this.terminal)throw new PlayerError('ABORTED','Player element is destroyed');
    this.resetQueue();this.queueRevision++;this.queueItems=[this.queueItem(source,options)];
    return this.activateQueue(0,()=>this.autoplay,options);
  }
  private async openSource(source:MediaSourceInput,options:OpenOptions={}) {
    if(this.terminal)throw new PlayerError('ABORTED','Player element is destroyed');
    const version=++this.sourceVersion;this.sourceAbort?.abort();const controller=this.sourceAbort=new AbortController();
    const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
    try {const core=this.core??await this.waitReady(controller.signal);if(this.terminal||version!==this.sourceVersion||controller.signal.aborted)throw new PlayerError('ABORTED','Open aborted');
      this.lastSource=source;this.lastOptions={...options,signal:undefined};this.clearError();
      await core.open(source,{...options,trackPolicy:{...this.trackConfiguration,...normalizeTrackPolicy(options.trackPolicy)},signal:controller.signal});
      if(version===this.sourceVersion&&!controller.signal.aborted&&this.core===core){this.sourceName=sourceTitle(source);this.sourceNameId=core.state.sourceId;this.updateTitle();}
    }finally{options.signal?.removeEventListener('abort',abort);}
  }
  close(){this.hoverPreview.hide();this.sourceVersion++;this.sourceAbort?.abort();this.resetQueue();this.lastSource=undefined;this.lastOptions=undefined;this.clearError();return this.core?this.core.close():this.terminal?Promise.reject(new PlayerError('ABORTED','Player element is destroyed')):Promise.resolve();}
  play(){if(this.queueOperation)this.queuePlayIntent=true;return this.core?this.core.play():this.ready.then(p=>p.play());}
  pause(){if(this.queueOperation)this.queuePlayIntent=false;return this.core?this.core.pause():this.ready.then(p=>p.pause());}
  seek(seconds:number){return this.ready.then(p=>p.seek(seconds));}
  setVolume(value:number){return this.ready.then(p=>p.setVolume(value));}
  setMuted(value:boolean){return this.ready.then(p=>p.setMuted(value));}
  setPlaybackRate(value:number){return this.ready.then(p=>p.setPlaybackRate(value));}
  selectAudioTrack(id:string|null){return this.ready.then(p=>p.selectAudioTrack(id));}
  selectSubtitleTrack(id:string|null){return this.ready.then(p=>p.selectSubtitleTrack(id));}
  addSubtitle(file:File,options?:SubtitleOptions){return this.ready.then(p=>p.addSubtitle(file,options));}
  destroy():Promise<void>{
    this.hoverPreview.destroy();
    if(this.terminal)return this.cleanup;clearTimeout(this.hideTimer);clearTimeout(this.seekPreviewTimer);this.terminal=true;this.connection++;this.sourceVersion++;this.sourceAbort?.abort();this.resetQueue();this.lastSource=undefined;this.lastOptions=undefined;this.sourceName='';this.sourceNameId=null;this.updateTitle();this.unsubscribe?.();this.resizeObserver?.disconnect();document.removeEventListener('fullscreenchange',this.fullscreenChanged);document.removeEventListener('pointerdown',this.dismissMenu,true);
    this.rejectReady(new PlayerError('ABORTED','Player element is destroyed'));const old=this.core;this.core=undefined;
    this.cleanup=Promise.all([this.cleanup,this.connecting,old?.destroy()]).then(()=>{this.$('surface').replaceChildren();this.$('controls').hidden=true;this.$('transport').hidden=true;this.$('topbar').hidden=true;this.$('settings').hidden=true;this.$('empty').hidden=true;this.$('diagnostics-overlay').hidden=true;this.$('buffering-indicator').hidden=true;});return this.cleanup;
  }
  private run(work:Promise<unknown>){void work.catch(error=>{if(!this.terminal&&playerError(error).code!=='ABORTED')this.showError(playerError(error).toJSON());});}
  private componentError(error:unknown){const detail=playerError(error).toJSON();this.showError(detail);this.dispatchEvent(new CustomEvent('error',{detail}));}
  private showError(error:SessionError){if(error.code==='ABORTED')return;this.lastFailure=error;this.$('error').hidden=false;this.$('error-text').textContent=error.message;this.$('retry').hidden=!error.retryable;this.$('retry').textContent=error.code==='AUTOPLAY_BLOCKED'?this.labels.play:this.labels.retry;this.announce(error.message,false);}
  private clearError(){this.lastFailure=undefined;this.$('error').hidden=true;}
  private announce(text:string,visual=true){this.$('status').classList.toggle('sr',!visual);if(text===this.lastAnnouncement)return;this.lastAnnouncement=text;this.$('status').textContent=text;}
  private geometry(state:PlayerState){const ratio=state.mediaInfo.aspectRatio;if(!ratio){this.$('stage').style.removeProperty('--media-aspect');return;}this.$('stage').style.setProperty('--media-aspect',String(ratio));if(state.pendingOperation)return;const {width,height}=outputDimensions(ratio),key=`${width}x${height}`;if(this.dimensions!==key){this.dimensions=key;this.core?.resize(width,height);}}
  private update(state:PlayerState){
    const identity=`${state.sourceId}:${state.activeMode}`;if(identity!==this.previewIdentity||state.pendingOperation||!this.controls){this.hoverPreview.hide();this.previewIdentity=identity;}
    // A host using the core directly owns its source list; release ours on replacement.
    if(!this.queueOperation&&this.queueSourceId!==null&&this.queueSourceId!==state.sourceId)this.resetQueue();
    this.renderQueue();
    this.updateSourceLabel();
    if(this.sourceNameId!==state.sourceId){this.sourceName='';this.sourceNameId=null;this.updateTitle();}
    const labels=this.labels,pending=state.pendingOperation!==null;
    this.$('topbar').hidden=!this.controls;
    const seeking=state.pendingOperation?.kind==='seeking';if(seeking!==this.wasSeeking){this.wasSeeking=seeking;clearTimeout(this.seekPreviewTimer);if(this.$('shell').classList.contains('idle')){this.$('shell').classList.add('seek-preview');if(!seeking)this.seekPreviewTimer=setTimeout(()=>this.$('shell').classList.remove('seek-preview'),800);}else this.revealControls();}
    const playing=state.status==='playing';if(this.$('shell').classList.contains('playing')!==playing){this.$('shell').classList.toggle('playing',playing);if(!this.$('shell').classList.contains('idle')||state.playbackIntent==='pause'||['ended','error','idle'].includes(state.status))this.revealControls();}
    this.$('controls').hidden=!this.controls||!state.sourceId;this.$('transport').hidden=!this.controls||!state.sourceId;this.$('empty').hidden=!this.showSourceControls||!!state.sourceId;this.$('poster').hidden=!this.poster||!!state.sourceId;
    this.iconButton('play',state.playbackIntent==='play'?'pause':'play',state.playbackIntent==='play'?labels.pause:labels.play);(this.$('play') as HTMLButtonElement).disabled=!state.sourceId||pending;
    this.iconButton('mute',state.muted?'muted':'volume',state.muted?labels.unmute:labels.mute);this.$('mute').setAttribute('aria-pressed',String(state.muted));
    this.reflected=true;this.toggleAttribute('muted',state.muted);this.reflected=false;
    if(this.shadowRoot!.activeElement!==this.$('volume'))this.input('volume').value=String(state.volume);this.$('volume').style.setProperty('--volume-progress',`${Number(this.input('volume').value)*100}%`);
    const window=state.seekable;this.input('timeline').disabled=pending||!window?.length;for(const id of ['back','forward'])(this.$(id) as HTMLButtonElement).disabled=pending||!window?.length;
    if(window?.length){this.input('timeline').min=String(window[0].start);this.input('timeline').max=String(window.at(-1)!.end);}
    if(!this.dragging){this.input('timeline').value=String(state.currentTime);this.input('timeline').setAttribute('aria-valuetext',formatTime(state.currentTime));this.$('time').textContent=formatTime(state.currentTime);this.$('duration').textContent=state.streamType==='live'?labels.live:state.duration===null?labels.unknown:formatTime(state.duration);this.timelineProgress();}
    const signature=JSON.stringify([state.audioTracks,state.subtitleTracks,state.trackPolicy]);if(signature!==this.trackSignature){this.trackSignature=signature;this.trackOptions('audio',state.audioTracks,state.trackPolicy.audio);this.trackOptions('subtitles',state.subtitleTracks,state.trackPolicy.subtitles);}
    (this.$('subtitleFile') as HTMLInputElement).disabled=!this.showSourceControls||!!state.trackPolicy.subtitles?.locked||state.trackPolicy.subtitles?.allowed?.length===0;
    (this.$('speed') as HTMLSelectElement).value=String(state.playbackRate);
    const buffering=state.status==='buffering'&&state.playbackIntent==='play'&&!pending;this.$('buffering-indicator').hidden=!buffering;this.$('shell').classList.toggle('buffering',buffering);this.bufferedProgress(state);
    const opening=state.pendingOperation?.kind==='opening';
    if(opening&&this.openingOperation!==state.pendingOperation!.id){this.openingOperation=state.pendingOperation!.id;this.openingStage='Inspecting media…';}
    if(!opening){this.openingOperation=null;this.openingStage='';}
    const preparation=this.core?.preparationProgress??[];
    const preparing=preparation.filter(a=>['queued','loading','compiling'].includes(a.status));
    const ready=preparation.filter(a=>a.status==='ready').length;
    const names={inspector:'media inspector',hybrid:'Hybrid',software:'Software',font:'subtitle font'};
    const phase=preparing.find(a=>a.status==='compiling')??preparing[0];
    const preparationText=phase?`${phase.status==='compiling'?'Compiling':'Loading'} ${names[phase.name]}… · ${ready}/${preparation.length} ready`:preparation.length?ready===preparation.length?`Components ready · ${ready}/${preparation.length}`:`Ready · ${ready}/${preparation.length} prepared; others load when needed`:'';
    const activity=state.pendingOperation?.kind==='opening'?(phase?preparationText:this.openingStage||labels.loading):state.pendingOperation?.kind==='switching'?labels.switching:state.pendingOperation?.kind==='seeking'?labels.seeking:state.status==='buffering'?labels.buffering:'';
    const pill=activity||(!state.sourceId?preparationText:'');
    this.$('busy').hidden=!pill||seeking||buffering;this.$('busy').textContent=pill;
    this.$('busy').dataset.complete=String(!activity&&!phase);
    this.$('busy').setAttribute('aria-label',preparation.length&&!activity?preparation.map(a=>`${names[a.name]}: ${a.status}`).join('; '):pill);
    if(!this.lastFailure)this.announce(activity||(!state.sourceId?preparationText:'')||(state.streamType==='live'&&!window?.length?labels.noWindow:''),!pill);
    this.geometry(state);this.updateDiagnostics();
  }
  private setDiagnostics(show:boolean){show=show&&this.showDiagnostics&&this.controls;this.$('diagnostics-overlay').hidden=!show;this.$('diagnostics-toggle').setAttribute('aria-pressed',String(show));this.iconButton('diagnostics-toggle',show?'eyeOff':'eye',this.labels.diagnostics);if(show)this.updateDiagnostics(true);}
  private updateDiagnostics(force=false){if(this.$('diagnostics-overlay').hidden||!this.core)return;const now=performance.now();if(!force&&now-this.diagnosticsUpdated<500)return;this.diagnosticsUpdated=now;const s=this.core.state,d=this.core.diagnostics,m=s.mediaInfo;
    const lines=[this.labels.diagnostics,`Engine  ${s.activeMode??'—'} · ${s.automaticSelection?'automatic':'manual'}`,`State   ${s.status}${s.pendingOperation?' · '+s.pendingOperation.kind:''}`,`Time    ${formatTime(s.currentTime)} / ${s.streamType==='live'?this.labels.live:s.duration===null?'—':formatTime(s.duration)} · ${s.playbackRate}×`,`Video   ${m.video?.codec??'—'} · ${m.displayWidth??'—'} × ${m.displayHeight??'—'}`,`Audio   ${m.audio?.codec??'—'} · ${s.muted?'muted':Math.round(s.volume*100)+'%'}`];
    if(s.activeMode&&!['opening','switching','closing'].includes(s.pendingOperation?.kind??'')){
      if(!s.automaticSelection)lines.push('Selection  Selected manually.');
      else {
        const modes=['native','hybrid','software'];
        const attempts=(d.selection?.attempts??[]).filter(a=>modes.includes(a.mode)&&modes.indexOf(a.mode)<modes.indexOf(s.activeMode!)&&a.outcome!=='selected');
        if(attempts.length){
          lines.push('',`Why ${s.activeMode}?`);
          for(const mode of modes){
            const candidates=attempts.filter(a=>a.mode===mode);
            for(const reason of new Set([...candidates.filter(a=>a.outcome==='failed'),...candidates.filter(a=>a.outcome==='skipped')].map(a=>`${a.mode} ${a.outcome}: ${a.reason}`)))lines.push(reason);
          }
          lines.push('');
        }else if(s.activeMode!=='native')lines.push('Selection  No earlier route rejection recorded.');
      }
    }
    for(const [key,value] of Object.entries(d.backend??{}))if(['string','number','boolean'].includes(typeof value))lines.push(`${key}  ${String(value)}`);
    this.$('diagnostics-overlay').textContent=lines.join('\n');
  }
  private bufferedProgress(state:PlayerState){const ranges=state.seekable,min=ranges?.[0]?.start??0,max=ranges?.at(-1)?.end??0,span=max-min;
    const layers=span>0?(state.buffered??state.cached??[]).filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start&&r.end>min&&r.start<max).map(r=>{const start=Math.max(0,(r.start-min)/span*100),end=Math.min(100,(r.end-min)/span*100);return `linear-gradient(to right,transparent ${start}%,color-mix(in srgb,var(--demuxe-foreground) 45%,transparent) ${start}% ${end}%,transparent ${end}%)`;}):[];
    this.$('timeline').style.setProperty('--buffered',layers.join(',')||'linear-gradient(transparent,transparent)');
  }
  private timelineProgress(){const input=this.input('timeline'),min=Number(input.min),max=Number(input.max);input.style.setProperty('--progress',`${max>min?Math.max(0,Math.min(100,(Number(input.value)-min)/(max-min)*100)):0}%`);}
  private skip(delta:number){const state=this.core?.state,ranges=state?.seekable;if(!state||state.pendingOperation||!ranges?.length)return;const target=state.currentTime+delta;const range=ranges.find(r=>target<=r.end)??ranges.at(-1)!;this.run(this.seek(Math.max(range.start,Math.min(range.end-.05,target))));}
  private trackOptions(id:string,list:readonly MediaTrack[],policy?:TrackTypePolicy){
    const select=this.$(id) as HTMLSelectElement;select.replaceChildren();
    if(policy?.allowAuto!==false)select.add(new Option(this.labels.automatic,'auto'));
    if(policy?.allowOff!==false)select.add(new Option(this.labels.off,''));
    for(const t of list)select.add(new Option(t.label,t.id));
    select.value=list.find(t=>t.selected)?.id??(list.length?'':'auto');
    if(!list.some(t=>t.selected)&&policy?.allowOff!==false)select.value='';
    select.disabled=!!policy?.locked||!list.length;select.title=select.selectedOptions[0]?.textContent??'';
  }
  private settings(open:boolean,restoreFocus=true,trigger:'open-menu'|'settings-toggle'='settings-toggle'){if(open&&trigger==='open-menu'&&!this.showSourceControls)return;if(open)this.menuTrigger=trigger;this.revealControls();this.$('settings').hidden=!open;this.$('shell').classList.toggle('menu-open',open);if(open){const source=this.menuTrigger==='open-menu';this.$('source-options').hidden=!source;this.$('playback-options').hidden=source;this.$('settings-title').textContent=source?this.labels.open:this.labels.settings;this.$('settings').classList.toggle('source-menu',source);this.$('settings').scrollTop=0;}this.$('open-menu').setAttribute('aria-expanded',String(open&&this.menuTrigger==='open-menu'));this.iconButton('open-menu',open&&this.menuTrigger==='open-menu'?'folderOpen':'folder',this.labels.open);this.$('settings-toggle').setAttribute('aria-expanded',String(open&&this.menuTrigger==='settings-toggle'));if(open)this.$('settings-close').focus();else if(restoreFocus)this.$(this.menuTrigger).focus();}
  private fullscreen(){const active=document.fullscreenElement===this;const request=active?document.exitFullscreen():this.requestFullscreen?.();if(!request){this.announce(this.labels.noFullscreen);return;}void request.then(()=>{this.fullscreenChanged();},()=>this.announce(this.labels.noFullscreen));}
  private iconButton(id:string,icon:keyof typeof icons,label:string){const button=this.$(id);if(button.dataset.icon!==icon){button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[icon]}</svg>`;button.dataset.icon=icon;}if(icon==='back'||icon==='forward')button.querySelector('text')!.textContent=String(this.seekStep);button.classList.add('icon-button');button.setAttribute('aria-label',label);button.setAttribute('title',label);}
  private labelControls(){this.renderQueue();this.$('choose-file').textContent=this.queueItems.length?this.labels.addFiles:this.labels.open;this.updateSourceLabel();this.$('diagnostics-overlay').setAttribute('aria-label',this.labels.diagnostics);for(const [id,key]of Object.entries({mute:'mute','settings-toggle':'settings','settings-close':'closeSettings',fullscreen:'fullscreen','open':'open','open-menu':'open','url-submit':'openURL','retry':'retry'}))this.$(id).textContent=this.labels[key as keyof typeof defaultLabels];for(const [id,icon,key]of [['back','back','back'],['forward','forward','forward'],['play','play','play'],['mute','volume','mute'],['settings-toggle','settings','settings'],['settings-close','close','closeSettings'],['open-menu','folder','open'],['diagnostics-toggle','eye','diagnostics']] as const){delete this.$(id).dataset.icon;this.iconButton(id,id==='diagnostics-toggle'&&this.$(id).getAttribute('aria-pressed')==='true'?'eyeOff':id==='open-menu'&&this.$(id).getAttribute('aria-expanded')==='true'?'folderOpen':icon,this.labels[key]);}delete this.$('fullscreen').dataset.icon;this.fullscreenChanged();for(const [id,key]of Object.entries({timeline:'seek',volume:'volume',file:'open',subtitleFile:'addSubtitle'}))this.$(id).setAttribute('aria-label',this.labels[key as keyof typeof defaultLabels]);const opener=this.$('open');opener.innerHTML=`<svg class="open-folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons.folder}</svg><span></span><svg class="open-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;opener.querySelector('span')!.textContent=this.labels.open;for(const id of ['speed','audio','subtitles','previews'])this.$(id+'-label').textContent=this.labels[id as 'speed'|'audio'|'subtitles'|'previews'];this.$('settings-title').textContent=this.menuTrigger==='open-menu'?this.labels.open:this.labels.settings;this.$('media-file-label').textContent=this.labels.mediaFile;this.$('subtitle-file-label').textContent=this.labels.subtitleFile;for(const id of ['url','format','live'])this.$(id+'-label').textContent=this.labels[id==='live'?'streamLive':id as 'url'|'format'];}
  private renderShell(){this.shadowRoot!.innerHTML=`<style>${styles}</style><section id="shell" class="shell" part="container" aria-label="Media player"><div id="topbar" class="topbar" part="topbar"><span id="title" class="player-title" part="title" hidden></span><span class="space"></span><button id="diagnostics-toggle" aria-pressed="false" aria-controls="diagnostics-overlay"></button><button id="open-menu" aria-expanded="false" aria-controls="settings"></button><button id="settings-toggle" aria-expanded="false" aria-controls="settings"></button><button id="fullscreen"></button></div><div id="stage" class="stage" part="stage" tabindex="0"><div id="surface" class="surface"></div><img id="poster" class="poster" alt="" hidden><div id="empty" class="empty"><button id="open"></button></div><div id="busy" class="busy" aria-hidden="true" hidden></div></div><div id="buffering-indicator" class="buffering-indicator" aria-hidden="true" hidden><span></span></div><div id="transport" part="transport" class="transport" hidden><button id="back" disabled></button><button id="play" class="play" disabled></button><button id="forward" disabled></button></div><div id="controls" class="controls" part="controls"><slot name="before-controls"></slot><div id="thumbnail-preview" class="thumbnail-preview" part="preview" aria-hidden="true" hidden><img id="thumbnail-image" alt=""><span id="thumbnail-time"></span></div><input id="timeline" part="timeline" class="timeline" type="range" min="0" max="1" step="0.1" value="0" disabled><div class="times"><span id="time" class="time">0:00</span><div class="row" part="volume"><button id="mute" aria-pressed="false"></button><input id="volume" class="volume" type="range" min="0" max="1" step=".01" value="1"></div><div id="queue-navigation" class="queue-navigation" hidden><button id="previous-file" type="button"></button><span id="queue-count"></span><button id="next-file" type="button"></button></div><span class="space"></span><span id="duration" class="time">—</span></div><slot name="after-controls"></slot></div><section id="settings" class="settings" part="settings" aria-labelledby="settings-title" hidden><header><strong id="settings-title"></strong><button id="settings-close"></button></header><div id="playback-options"><label class="check"><input id="preview-toggle" type="checkbox" checked><span id="previews-label"></span></label><label class="setting-row"><span id="speed-label"></span><select id="speed">${[.5,.75,1,1.25,1.5,1.75,2].map(n=>`<option value="${n}">${n}×</option>`).join('')}</select></label><label class="setting-row track-setting"><span id="audio-label"></span><select id="audio" disabled></select></label><label class="setting-row track-setting"><span id="subtitles-label"></span><select id="subtitles" disabled></select></label></div><div id="source-options" hidden><div class="media-picker" role="group" aria-labelledby="media-file-label"><span id="media-file-label"></span><span id="current-source"></span><button id="choose-file" type="button" aria-describedby="current-source"></button><input id="file" type="file" multiple hidden></div><slot id="source-actions" name="source-actions"></slot><section id="queue-section" class="queue-section" aria-labelledby="queue-heading" hidden><div class="queue-header"><strong id="queue-heading"></strong><button id="clear-queue" type="button"></button></div><ol id="queue-list"></ol></section><label class="subtitle-picker"><span id="subtitle-file-label"></span><input id="subtitleFile" type="file" accept=".srt,.ass,.ssa,.vtt"></label><form id="remote"><label><span id="url-label"></span><input id="url" type="url" placeholder="https://…" required></label><label><span id="format-label"></span><select id="format"><option value="file">File</option><option value="hls">HLS</option><option value="dash">DASH</option></select></label><label class="check"><input id="live" type="checkbox"><span id="live-label"></span></label><button id="url-submit" type="submit"></button></form></div></section><div id="error" class="notice" part="error" hidden><span id="error-text"></span><button id="retry"></button></div><pre id="diagnostics-overlay" class="diagnostics-overlay" tabindex="0" role="region" hidden></pre><div id="status" class="status" part="status" role="status" aria-live="polite" aria-atomic="true"></div></section>`;
    this.labelControls();this.updateTitle();this.updateUtilities();this.$('controls').hidden=!this.controls;this.$('topbar').hidden=!this.controls;
    this.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')this.revealControls();});this.addEventListener('pointerdown',event=>{if(this.isScreenPress(event))this.stageWasIdle=this.$('shell').classList.contains('idle');else this.revealControls();});this.addEventListener('focusin',this.revealControls);this.addEventListener('focusout',()=>{if(!this.$('shell').classList.contains('idle'))this.revealControls();});
    this.addEventListener('pointerleave',event=>{if(event.pointerType!=='mouse'||this.terminal||!this.controls||this.core?.state.status!=='playing'||!this.core.state.sourceId||this.core.state.pendingOperation||this.dragging||!this.$('settings').hidden||this.shadowRoot?.activeElement?.matches(':focus-visible'))return;this.hideControls();});
    this.$('source-actions').addEventListener('click',event=>{if(this.showSourceControls&&event.composedPath().some(node=>node instanceof HTMLButtonElement)){this.settings(false,false);this.$('stage').focus({preventScroll:true});}});
    this.$('open-menu').onclick=()=>this.settings(this.$('settings').hidden||this.menuTrigger!=='open-menu',true,'open-menu');
    this.$('shell').onclick=event=>{if(!this.isScreenPress(event)||!this.core?.state.sourceId||!this.controls)return;if(this.stageWasIdle){this.$('stage').focus({preventScroll:true});this.revealControls();}else this.hideControls(true);};
    this.$('remote').onsubmit=event=>{event.preventDefault();if(!this.showSourceControls)return;const format=(this.$('format') as HTMLSelectElement).value as 'file'|'hls'|'dash';this.openFromControls({url:this.input('url').value,format,...(format!=='file'?{streaming:{live:this.input('live').checked}}:{})});};
    this.addEventListener('dragover',event=>{if(this.allowFileDrop&&event.dataTransfer?.types.includes('Files'))event.preventDefault();});this.addEventListener('drop',event=>{if(!this.allowFileDrop||!event.dataTransfer?.files.length)return;event.preventDefault();this.addFiles(Array.from(event.dataTransfer.files));});
    this.$('back').onclick=()=>this.skip(-this.seekStep);this.$('forward').onclick=()=>this.skip(this.seekStep);
    this.$('play').onclick=()=>{if(this.core)this.run(this.core.state.playbackIntent==='play'?this.pause():this.playFromControls());};
    this.$('mute').onclick=()=>{if(this.core)this.run(this.setMuted(!this.core.state.muted));};
    this.input('volume').oninput=()=>this.$('volume').style.setProperty('--volume-progress',`${Number(this.input('volume').value)*100}%`);
    this.input('volume').onchange=()=>this.run(this.setVolume(Number(this.input('volume').value)));
    this.input('timeline').oninput=()=>{this.dragging=true;const text=formatTime(Number(this.input('timeline').value));this.$('time').textContent=text;this.timelineProgress();this.input('timeline').setAttribute('aria-valuetext',text);};
    this.input('timeline').onchange=()=>{const value=Number(this.input('timeline').value);this.dragging=false;this.run(this.seek(value));};
    this.input('timeline').onpointercancel=()=>{this.dragging=false;if(this.core)this.update(this.core.state);};
    this.$('settings-toggle').onclick=()=>this.settings(this.$('settings').hidden||this.menuTrigger!=='settings-toggle',true,'settings-toggle');this.$('settings-close').onclick=()=>this.settings(false);
    this.input('preview-toggle').onchange=()=>{this.previewThumbnails=this.input('preview-toggle').checked;};
    this.$('speed').onchange=()=>this.run(this.setPlaybackRate(Number((this.$('speed') as HTMLSelectElement).value)));
    this.$('audio').onchange=()=>this.run(this.selectAudioTrack((this.$('audio') as HTMLSelectElement).value||null));
    this.$('subtitles').onchange=()=>this.run(this.selectSubtitleTrack((this.$('subtitles') as HTMLSelectElement).value||null));
    this.$('diagnostics-toggle').onclick=()=>this.setDiagnostics(this.$('diagnostics-overlay').hidden);
    this.$('fullscreen').onclick=()=>this.fullscreen();this.$('stage').ondblclick=()=>this.fullscreen();
    this.$('choose-file').onclick=()=>{if(this.showSourceControls)this.input('file').click();};
    this.$('open').onclick=()=>{if(this.showSourceControls)this.input('file').click();};this.input('file').onchange=()=>{const files=Array.from(this.input('file').files??[]);this.input('file').value='';if(this.showSourceControls)this.addFiles(files);};
    this.input('subtitleFile').onchange=()=>{const file=this.input('subtitleFile').files?.[0];this.input('subtitleFile').value='';if(file&&this.showSourceControls)this.run(this.addSubtitle(file));};
    this.$('previous-file').onclick=()=>this.selectQueue(this.queueIndex-1);
    this.$('next-file').onclick=()=>this.selectQueue(this.queueIndex+1);
    this.$('clear-queue').onclick=()=>{if(this.showSourceControls&&!this.queueOperation&&!this.core?.state.pendingOperation){this.settings(false,false);this.$('stage').focus({preventScroll:true});this.run(this.close());}};
    this.$('retry').onclick=()=>{const error=this.lastFailure;this.clearError();if(error?.code==='AUTOPLAY_BLOCKED')this.run(this.play());else if(this.lastSource)this.run(this.queueItems[this.queueIndex]?.source===this.lastSource?this.activateQueue(this.queueIndex,()=>this.autoplay):this.open(this.lastSource,this.lastOptions));};
    this.addEventListener('keydown',event=>{
      if(event.composedPath().includes(this.$('diagnostics-overlay'))){if(event.key==='Escape'){event.preventDefault();this.setDiagnostics(false);this.$('diagnostics-toggle').focus();}return;}
      const topbar=event.composedPath().includes(this.$('topbar')),key=shortcut(event,topbar);
      if(topbar&&key===' ')event.preventDefault();
      if(event.repeat&&this.$('settings').hidden&&[' ','k','m','f'].includes(key??'')){event.preventDefault();return;}
      if(!['arrowleft','arrowright','j','l','home','end','0','1','2','3','4','5','6','7','8','9'].includes(key??'')||!this.$('shell').classList.contains('idle'))this.revealControls();
      if(event.key==='Escape'&&!this.$('settings').hidden){event.preventDefault();this.settings(false);return;}
      if(!this.$('settings').hidden)return;const p=this.core;if(!key||!p)return;
      let action:Promise<unknown>|undefined;const state=p.state;
      if(key==='f'){event.preventDefault();this.fullscreen();return;}
      if(key==='?' ){event.preventDefault();this.settings(true);return;}
      if(key==='m')action=p.setMuted(!state.muted);
      if(key==='arrowup'||key==='arrowdown')action=p.setVolume(Math.max(0,Math.min(1,state.volume+(key==='arrowup'?.05:-.05))));
      if(key==='['||key===']')action=p.setPlaybackRate(Math.max(.5,Math.min(2,state.playbackRate+(key===']'?.25:-.25))));
      if(!state.pendingOperation&&state.sourceId){if(key==='c'&&!state.trackPolicy.subtitles?.locked&&(!state.subtitlesVisible||state.trackPolicy.subtitles?.allowOff!==false))action=p.subtitleVisible(!state.subtitlesVisible);const ranges=state.seekable;if(ranges?.length){const start=ranges[0].start,end=Math.max(start,ranges.at(-1)!.end-.1);if(key==='home')action=p.seek(start);if(key==='end')action=p.seek(end);if(/^[0-9]$/.test(key))action=p.seek(start+(end-start)*Number(key)/10);}
      if(key===' '||key==='k')action=state.playbackIntent==='play'?this.pause():this.playFromControls();const delta=key==='arrowleft'?-5:key==='arrowright'?5:key==='j'?-this.seekStep:key==='l'?this.seekStep:0;const window=state.seekable;if(delta&&window?.length)action=p.seek(Math.max(window[0].start,Math.min(window.at(-1)!.end-.05,state.currentTime+delta)));}
      if(action){event.preventDefault();this.run(action);}
    });
  }
}
export function definePlayerElement(name='demuxe-player'):typeof DemuxePlayerElement {
  if(typeof customElements==='undefined')throw new PlayerError('INVALID_ARGUMENT','Custom element registration requires a browser');
  const existing=customElements.get(name);if(existing&&existing!==DemuxePlayerElement)throw new PlayerError('INVALID_ARGUMENT',`Custom element ${name} is already registered with another implementation`);
  if(!existing)customElements.define(name,DemuxePlayerElement);return DemuxePlayerElement;
}

declare global {
  interface HTMLElementTagNameMap {
    'demuxe-player': DemuxePlayerElement;
  }
}
