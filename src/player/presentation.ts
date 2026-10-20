// SPDX-License-Identifier: Apache-2.0
/** Presentation options belong to the element, never the playback engine. */
export const playerLayouts = ['classic','cinema','rail','studio','focus','deck'] as const;
export type PlayerLayout = typeof playerLayouts[number];
export type {PlayerTheme} from './themes.js';
import {scrimGradient} from './themes.js';
export function isPlayerLayout(value:unknown):value is PlayerLayout {
  return typeof value==='string'&&(playerLayouts as readonly string[]).includes(value);
}
export const playerDocks = ['off','corner'] as const;
export type PlayerDock = typeof playerDocks[number];
// Below-picture compositions share the framed time display and keep controls visible.
const framedLayouts:ReadonlySet<PlayerLayout> = new Set(['cinema','studio','deck']);
const headerActionLayouts:ReadonlySet<PlayerLayout> = new Set(['studio']);

/** Recompose existing controls. The stage, media host, panels and listeners survive. */
/** compact: retain centered transport for touch; desktop Classic uses the bottom row. */
export function applyLayout(root:ShadowRoot, layout:PlayerLayout, hasSource=false, compact=false):void {
  const node=(id:string)=>root.getElementById(id)!;
  const shell=node('shell'),composition=`${layout}:${hasSource}:${compact}`;
  if(shell.dataset.composition===composition)return;
  const focus=root.activeElement as HTMLElement|null;
  const transport=node('transport'),actions=node('utility-actions'),row=node('control-row'),controls=node('controls');
  let times=root.getElementById('time-display');
  const groupTimes=()=>{
    if(!times){times=document.createElement('div');times.id='time-display';times.className='time-display';times.setAttribute('part','time-display');}
    times.append(node('time'),node('duration'));
    return times!;
  };
  if(layout==='classic'&&!compact){
    row.prepend(transport,node('volume-control'),groupTimes());
    row.insertBefore(node('queue-navigation'),node('control-spacer'));
    if(hasSource)row.append(actions);else node('topbar').append(actions);
  }else if(framedLayouts.has(layout)){
    row.prepend(transport,groupTimes(),node('volume-control'));
    if(layout==='deck')controls.insertBefore(transport,node('timeline'));
    if(hasSource&&!headerActionLayouts.has(layout))row.append(actions);else node('topbar').append(actions);
    row.append(node('queue-navigation'));
  }else{
    shell.insertBefore(transport,controls);
    node('topbar').append(actions);
    if(compact&&layout==='classic'){
      // Phone rows read "time / duration" then mute, in DOM order for focus and reading.
      row.prepend(groupTimes());
      row.insertBefore(node('queue-navigation'),node('control-spacer'));
      row.append(node('volume-control'));
    }else{
      row.prepend(node('time'),node('volume-control'));
      row.append(node('duration'));
      row.insertBefore(node('queue-navigation'),node('control-spacer'));
      times?.remove();
    }
  }
  shell.dataset.compact=String(compact);
  shell.dataset.layout=layout;
  shell.dataset.composition=composition;
  if(focus?.isConnected&&root.activeElement!==focus)focus.focus({preventScroll:true});
}

// Console layouts start from Studio's header and below-picture console.
const consoleLayouts='[data-layout=studio]';
const persistent=':is([data-layout=studio],[data-layout=deck])';
export const presentationStyles = `
.appearance-settings{min-width:0;margin:14px 0 0;padding:8px 0 0;border:0;border-top:1px solid var(--demuxe-border)}
.appearance-settings legend{padding:0 8px 0 0;color:var(--demuxe-muted-foreground);font-size:11px}
.utility-actions{display:flex;align-items:center;gap:6px;flex:none;pointer-events:auto}
.time-display{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap}
.time-display #duration{color:var(--demuxe-muted-foreground)}
.time-display #duration::before{content:'/';margin-right:8px;color:var(--demuxe-muted-foreground)}

/* Shared sizing; each composition below has its own control placement. */
.shell:not([data-layout=classic]) .icon-button{width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px;border-radius:8px}
.shell:not([data-layout=classic]) .transport{gap:4px;visibility:visible}
.shell:not([data-layout=classic]) .transport .icon-button,.shell:not([data-layout=classic]) .transport #back,.shell:not([data-layout=classic]) .transport #forward{width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px;padding:10px}
.shell:not([data-layout=classic]) .transport .icon-button svg{width:24px;height:24px;filter:none}
.shell:not([data-layout=classic]) .transport .play svg{width:26px;height:26px}
.shell:not([data-layout=classic]) .transport .icon-button:hover{background:var(--demuxe-control-background);transform:none}
.shell:not([data-layout=classic]) .time{font:11px/1.5 ui-monospace,SFMono-Regular,monospace;letter-spacing:.02em}
.shell:not([data-layout=classic]) .queue-navigation{grid-column:1/-1;width:auto;justify-content:center;justify-self:center;margin:0;gap:6px}
.shell:not([data-layout=classic]) .settings{top:68px;bottom:auto;right:16px;max-height:calc(100% - 84px);max-width:calc(100% - 32px)}
.shell:not([data-layout=classic]) .controls .utility-actions{gap:0}
.shell:not([data-layout=classic]) .player-title{font-weight:500;letter-spacing:.015em}

/* Classic follows the familiar video-site overlay: timeline, then a single control row.
   Compact controls keep their centered transport and generous touch targets. */
/* Measured desktop YouTube chrome: 250ms reveal, 100ms dismissal, no stagger. */
.shell[data-layout=classic] :is(.topbar,.controls,.transport){translate:none;scale:1;transition:opacity 250ms cubic-bezier(0,0,.2,1)}
.shell[data-layout=classic].idle :is(.topbar,.controls,.transport){transition:opacity 100ms cubic-bezier(.4,0,1,1)}
.shell[data-layout=classic].idle :is(.topbar .icon-button,.transport .icon-button,.controls .timeline,.controls .times){opacity:1}
.shell[data-layout=classic][data-compact=false] .controls .transport{opacity:1}
.shell[data-layout=classic] :is(.topbar .icon-button,.transport .icon-button,.controls .timeline,.controls .times){translate:none;scale:1;transition-delay:0ms;transition-duration:0ms}
@media(prefers-reduced-motion:reduce){.shell[data-layout=classic] :is(.topbar,.controls,.transport){transition:none}}
.shell[data-layout=classic]{border:0;font-family:Arial,Helvetica,sans-serif}
.shell[data-layout=classic] .controls{padding:28px 12px 4px;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;--demuxe-foreground:#fff;--demuxe-muted-foreground:#ddd}
.shell[data-layout=classic] .timeline{--demuxe-accent:#f03;height:20px;min-height:20px;--timeline-thumb-size:12px}
.shell[data-layout=classic] .timeline::-webkit-slider-runnable-track{background:linear-gradient(to right,#f03 var(--progress),transparent var(--progress)),var(--buffered,linear-gradient(transparent,transparent)),#ffffff38}
.shell[data-layout=classic] .timeline::-moz-range-track{background:var(--buffered,linear-gradient(transparent,transparent)),#ffffff38}
.shell[data-layout=classic] .timeline::-moz-range-progress{background:#f03}
.shell[data-layout=classic][data-compact=false] .timeline::-webkit-slider-thumb{scale:0;transition:scale var(--t-quick)}
.shell[data-layout=classic][data-compact=false] .timeline::-moz-range-thumb{scale:0;transition:scale var(--t-quick)}
.shell[data-layout=classic][data-compact=false] .timeline:is(:hover,:focus-visible,:active)::-webkit-slider-thumb{scale:1;box-shadow:none}
.shell[data-layout=classic][data-compact=false] .timeline:is(:hover,:focus-visible,:active)::-moz-range-thumb{scale:1;box-shadow:none}
.shell[data-layout=classic] .time{font:13px/1.5 Arial,Helvetica,sans-serif;letter-spacing:0}
.shell[data-layout=classic] .time-display{gap:4px}
.shell[data-layout=classic] .time-display #duration::before{margin-right:4px}
.shell[data-layout=classic] .topbar{background:linear-gradient(#0009,transparent);color:#fff}
.shell[data-layout=classic] .player-title{font-size:18px;text-shadow:0 1px 2px #0008}
.shell[data-layout=classic][data-compact=false] .controls .times{gap:8px;min-height:44px}
.shell[data-layout=classic][data-compact=false] .transport{position:static;transform:none;translate:none;scale:1;gap:0;flex:none;padding:0;background:none;box-shadow:none}
.shell[data-layout=classic][data-compact=false] .transport #back,.shell[data-layout=classic][data-compact=false] .transport #forward{display:none}
.shell[data-layout=classic][data-compact=false] .icon-button{width:40px;height:44px;min-width:40px;min-height:44px;flex-basis:40px;border-radius:4px;padding:8px}
.shell[data-layout=classic][data-compact=false] .transport .play{background:transparent}
.shell[data-layout=classic][data-compact=false] .transport .play svg{width:28px;height:28px}
.shell[data-layout=classic][data-compact=false] .icon-button svg{filter:drop-shadow(0 1px 2px #0006)}
.shell[data-layout=classic][data-compact=false] .icon-button:hover{background:#ffffff15;transform:none}
.shell[data-layout=classic][data-compact=false] .utility-actions{gap:0}
.shell[data-layout=classic][data-compact=false] #mute svg path:first-child{fill:currentColor;stroke-width:0}
.shell[data-layout=classic][data-compact=false] #fullscreen svg{stroke-width:2.5}
.shell[data-layout=classic][data-compact=false] .controls .icon-button{position:relative}
.shell[data-layout=classic][data-compact=false] .controls .icon-button:is(:hover,:focus-visible)::after{content:attr(aria-label);position:absolute;bottom:72px;right:0;width:max-content;max-width:220px;padding:6px 9px;border-radius:4px;background:#222e;color:#fff;font:500 12px/1.4 Arial,Helvetica,sans-serif;pointer-events:none}
.shell[data-layout=classic][data-compact=false] .transport .icon-button::after,.shell[data-layout=classic][data-compact=false] #mute::after{left:0;right:auto}
.shell[data-layout=classic][data-compact=false] .volume{width:52px}
.shell[data-layout=classic][data-compact=false] .settings{top:auto;bottom:76px;right:12px;max-height:min(360px,calc(100% - 88px));transform-origin:bottom right;--menu-offset:6px}
.shell[data-layout=classic][data-compact=false] .settings .track-setting{display:flex;padding:0;gap:12px}
.shell[data-layout=classic][data-compact=false] .settings .track-setting>span{font-size:13px;color:var(--demuxe-foreground)}
.shell[data-layout=classic][data-compact=false] .settings .track-setting select{width:auto;max-width:65%;text-align:right;background:transparent;padding:8px}
.shell[data-layout=classic][data-compact=true] .transport .icon-button{background:#0006;border-radius:50%}
@container player (max-width:600px){
 .shell[data-layout=classic][data-compact=false] .controls .times{gap:2px}
 .shell[data-layout=classic][data-compact=false] .utility-actions #diagnostics-toggle{display:none}
 .shell[data-layout=classic][data-compact=false] .volume{width:36px}
 .shell[data-layout=classic] .player-title{font-size:14px}
}
@media(forced-colors:active){
 .shell[data-layout=classic] .controls{background:Canvas;color:CanvasText;--demuxe-foreground:CanvasText;--demuxe-muted-foreground:CanvasText}
 .shell[data-layout=classic] .timeline{appearance:auto}
}

/* Cinema: broad, unboxed bottom strip with centered transport. */
.shell[data-layout=cinema] .topbar{padding:16px 24px 36px}
.shell[data-layout=cinema] .controls{padding:38px 24px 14px;background:${scrimGradient('to top','50%')}}
.shell[data-layout=cinema] .times{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px 16px;align-items:center}
.shell[data-layout=cinema] .transport{position:static;transform:none;translate:none;scale:1;background:none;padding:0;grid-column:2;grid-row:1;justify-self:center}
.shell[data-layout=cinema] .time-display{grid-column:1;grid-row:1;align-self:start;padding-top:6px}
.shell[data-layout=cinema] #volume-control{grid-column:1;grid-row:1;align-self:end;padding-top:18px;translate:0 5px}
.shell[data-layout=cinema] .utility-actions{grid-column:3;grid-row:1;justify-self:end}
.shell[data-layout=cinema] #control-spacer{display:none}
.shell[data-layout=cinema] .transport .play{border-radius:50%;background:var(--demuxe-foreground);color:var(--demuxe-background)}
.shell[data-layout=cinema] .settings:has(#playback-options:not([hidden])){top:auto;bottom:112px;max-height:calc(100% - 128px)}
.shell[data-layout=cinema].idle .utility-actions,.shell[data-layout=cinema].idle .queue-navigation{opacity:0;pointer-events:none}
.shell[data-layout=cinema].idle.seek-preview .controls{background:transparent}

/* Rail: transport down the left edge, picture and timeline left open. */
.shell[data-layout=rail] .transport{left:20px;top:50%;transform:translateY(-50%);flex-direction:column;padding:6px;border:1px solid var(--demuxe-border);border-radius:18px;background:var(--demuxe-scrim-background);backdrop-filter:blur(18px)}
.shell[data-layout=rail] .transport .play{order:-1;background:var(--demuxe-foreground);color:var(--demuxe-background);border-radius:12px}
.shell[data-layout=rail] .topbar{padding:16px 22px 30px}
.shell[data-layout=rail] .controls{padding:30px 24px 16px}
.shell[data-layout=rail] .times{gap:12px}
.shell[data-layout=rail] #volume-control{margin-left:auto}
.shell[data-layout=rail] #control-spacer{display:none}
.shell[data-layout=rail] .queue-navigation{margin-inline:auto}

/* Studio: a persistent header and a balanced console below the picture. */
.shell${consoleLayouts}{display:flex;flex-direction:column}
.shell${consoleLayouts} .topbar{position:relative;inset:auto;flex:none;padding:8px 20px;background:var(--demuxe-panel-background);border-bottom:1px solid var(--demuxe-border)}
.shell${consoleLayouts} .player-title{font-size:12px;letter-spacing:.04em}
.shell${consoleLayouts} .stage{flex:1;height:auto;min-height:0}
.shell${consoleLayouts} .controls{position:relative;inset:auto;flex:none;padding:4px 20px 12px;background:var(--demuxe-panel-background);border-top:1px solid var(--demuxe-border)}
.shell${consoleLayouts} .times{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px 12px;align-items:center}
.shell${consoleLayouts} .transport{position:static;transform:none;translate:none;scale:1;grid-column:2;grid-row:1;background:none;padding:0}
.shell${consoleLayouts} .transport .play{background:var(--demuxe-control-background);border:1px solid var(--demuxe-border);border-radius:10px}
.shell${consoleLayouts} .time-display{grid-column:1;grid-row:1}
.shell${consoleLayouts} #volume-control{grid-column:3;grid-row:1;justify-self:end}
.shell${consoleLayouts} #control-spacer{display:none}
.shell${consoleLayouts} .time{text-shadow:none}

/* Focus: a floating transport capsule and a quiet edge-to-edge timeline. */
.shell[data-layout=focus] .transport{top:auto;bottom:90px;left:50%;transform:translateX(-50%);padding:8px 12px;gap:12px;border:1px solid var(--demuxe-border);border-radius:100px;background:var(--demuxe-scrim-background);backdrop-filter:blur(20px);box-shadow:0 8px 28px #0003}
.shell[data-layout=focus] .transport .play{width:56px;height:56px;flex-basis:56px;min-width:56px;min-height:56px;border-radius:50%;background:var(--demuxe-foreground);color:var(--demuxe-background)}
.shell[data-layout=focus] .transport .play svg{width:28px;height:28px}
.shell[data-layout=focus] .topbar{padding:16px 20px 28px}
.shell[data-layout=focus] .controls{padding:16px 24px 10px}
.shell[data-layout=focus] .times{gap:12px}
.shell[data-layout=focus] #volume-control{margin-left:auto}
.shell[data-layout=focus] #control-spacer{display:none}
.shell[data-layout=focus] .queue-navigation{margin-inline:auto}

/* Deck: a playback pad to the left of a two-row timeline and utility desk. */
.shell[data-layout=deck]{display:flex;flex-direction:column}
.shell[data-layout=deck] .stage{flex:1;height:auto;min-height:0}
.shell[data-layout=deck] .controls{position:relative;inset:auto;flex:none;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:22px;align-items:center;padding:12px 20px;background:var(--demuxe-panel-background);border-top:1px solid var(--demuxe-border)}
.shell[data-layout=deck] .transport{position:static;transform:none;translate:none;scale:1;grid-column:1;grid-row:1/3;display:grid;grid-template-columns:44px 44px;gap:0;background:none;padding:0 20px 0 0;border-right:1px solid var(--demuxe-border);border-radius:0}
.shell[data-layout=deck] .transport .play{grid-column:1/-1;grid-row:1;justify-self:center;width:56px;height:56px;min-width:56px;min-height:56px;border-radius:50%;background:var(--demuxe-foreground);color:var(--demuxe-background)}
.shell[data-layout=deck] #back{grid-column:1;grid-row:2}
.shell[data-layout=deck] #forward{grid-column:2;grid-row:2}
.shell[data-layout=deck] .timeline{grid-column:2;grid-row:1;align-self:end}
.shell[data-layout=deck] .times{grid-column:2;grid-row:2;display:flex;flex-wrap:wrap;gap:0 12px;align-items:center}
.shell[data-layout=deck] .time-display{margin-right:auto}
.shell[data-layout=deck] #control-spacer{display:none}
.shell[data-layout=deck] .queue-navigation{width:100%}
.shell[data-layout=deck] slot{grid-column:1/-1}
.shell[data-layout=deck] .time{text-shadow:none}

/* Controls outside the picture remain usable during playback. */
.shell${persistent}.idle{cursor:auto}
.shell${persistent}.idle .controls,.shell${persistent}.idle .controls *{opacity:1;translate:none;scale:1;visibility:visible;pointer-events:auto}
.shell${consoleLayouts}.idle .topbar,.shell${consoleLayouts}.idle .topbar *{opacity:1;translate:none;scale:1;pointer-events:auto}
.shell${persistent}.idle.seek-preview .controls{background:var(--demuxe-panel-background)}
:host(:fullscreen) .shell${persistent} .stage{height:auto;min-height:0;max-height:none}

@container player (max-width:650px){
 .shell:not([data-layout=classic]) .topbar{padding:8px 12px 20px}
 .shell:not([data-layout=classic]) .player-title{font-size:12px}
 .shell:not([data-layout=classic]) .controls{padding-inline:12px}
 .shell:not([data-layout=classic]) .settings,.shell[data-layout=cinema] .settings:has(#playback-options:not([hidden])){top:60px;bottom:auto;right:8px;max-width:calc(100% - 16px);max-height:calc(100% - 72px)}
 .shell[data-layout=cinema] .times{grid-template-columns:minmax(0,1fr) auto;gap:0 8px}
 .shell[data-layout=cinema] .stage{min-height:340px}
 .shell[data-layout=cinema] .transport{grid-column:1;grid-row:1;justify-self:start}
 .shell[data-layout=cinema] .time-display{grid-column:1;grid-row:2;padding:4px 0;align-self:center}
 .shell[data-layout=cinema] #volume-control{grid-column:2;grid-row:1;align-self:center;padding:0;translate:none;justify-self:end}
 .shell[data-layout=cinema] .utility-actions{grid-column:2;grid-row:2}
 .shell${consoleLayouts} .topbar{padding:4px 10px}
 .shell${consoleLayouts} .times{grid-template-columns:minmax(0,1fr) auto;gap:0 8px}
 .shell${consoleLayouts} .transport{grid-column:1;grid-row:1;justify-self:start}
 .shell${consoleLayouts} #volume-control{grid-column:2;grid-row:1}
 .shell${consoleLayouts} .time-display{grid-column:1/-1;grid-row:2;justify-self:center;padding-top:4px}
 .shell[data-layout=rail] .transport{left:12px;padding:4px;border-radius:14px}
 .shell[data-layout=focus] .transport{bottom:88px;padding:6px 10px;gap:4px}
 .shell[data-layout=deck] .controls{column-gap:12px;padding-block:10px}
 .shell[data-layout=deck] .transport{padding-right:12px}
 .shell[data-layout=deck] .times{gap:0 8px}
 .shell[data-layout=deck] .time-display{width:100%;font-size:10px}
 .shell[data-layout=deck] .utility-actions{margin-left:auto}
 .shell[data-layout=deck] #volume-control{display:flex}
}
@container player (max-width:400px){
 .shell[data-layout=cinema] .time-display{grid-column:1/-1;grid-row:2;justify-self:center}
 .shell[data-layout=cinema] .utility-actions{grid-column:1/-1;grid-row:3;justify-self:center;gap:8px}
 .shell[data-layout=deck] .controls{grid-template-columns:1fr}
 .shell[data-layout=deck] .transport{grid-column:1;grid-row:2;display:flex;justify-content:center;padding:0;border:0}
 .shell[data-layout=deck] .transport .play{order:0;width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px}
 .shell[data-layout=deck] .timeline{grid-column:1;grid-row:1}
 .shell[data-layout=deck] .times{grid-column:1;grid-row:3;justify-content:space-between}
 .shell[data-layout=deck] .time-display{width:100%;justify-content:center}
 .shell[data-layout=deck] .utility-actions{margin:0}
 .shell[data-layout=rail] .volume,.shell[data-layout=focus] .volume{width:32px}
 .shell[data-layout=rail] .times,.shell[data-layout=focus] .times{gap:6px;flex-wrap:wrap}
 .shell[data-layout=rail] .queue-navigation,.shell[data-layout=focus] .queue-navigation{order:5;width:100%}
}
@media(pointer:coarse){.shell:not([data-layout=classic]) .utility-actions .icon-button{width:44px;min-width:44px;flex-basis:44px}}
:host(:fullscreen) .shell[data-layout=cinema] .stage{min-height:0}
@media(forced-colors:active){
 .shell:not([data-layout=classic]) .transport,.shell:not([data-layout=classic]) .controls{background:Canvas;color:CanvasText;backdrop-filter:none}
 .shell:not([data-layout=classic]) .transport .play{background:ButtonFace;color:ButtonText;border:1px solid ButtonText}
}
`;
