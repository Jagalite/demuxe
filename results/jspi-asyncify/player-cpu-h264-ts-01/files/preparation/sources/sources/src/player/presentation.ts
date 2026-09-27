// SPDX-License-Identifier: Apache-2.0
/** Presentation options belong to the element, never the playback engine. */
export type PlayerLayout = 'classic' | 'modern';
export type PlayerTheme = 'demuxe' | 'light';

/** Recompose existing controls. The stage, media host, panels and listeners survive. */
export function applyLayout(root:ShadowRoot, layout:PlayerLayout, hasSource=false):void {
  const node=(id:string)=>root.getElementById(id)!;
  const shell=node('shell');
  const composition=`${layout}:${hasSource}`;
  if(shell.dataset.composition===composition)return;
  const focus=root.activeElement as HTMLElement|null;
  const transport=node('transport'), actions=node('utility-actions'), row=node('control-row');
  let times=root.getElementById('time-display');
  if(layout==='modern'){
    if(!times){times=document.createElement('div');times.id='time-display';times.className='time-display';times.setAttribute('part','time-display');}
    times.append(node('time'),node('duration'));
    row.prepend(transport,times);
    if(hasSource)row.append(actions);else node('topbar').append(actions);
    row.append(node('queue-navigation'));
  }else{
    shell.insertBefore(transport,node('controls'));
    node('topbar').append(actions);
    row.prepend(node('time'));
    row.append(node('duration'));
    row.insertBefore(node('queue-navigation'),node('control-spacer'));
    times?.remove();
  }
  shell.dataset.layout=layout;
  shell.dataset.composition=composition;
  // append() can blur a reparented control. Restore only existing focused controls.
  if(focus?.isConnected&&root.activeElement!==focus)focus.focus({preventScroll:true});
}

export const presentationStyles = `
.appearance-settings{min-width:0;margin:14px 0 0;padding:8px 0 0;border:0;border-top:1px solid var(--demuxe-border)}
.appearance-settings legend{padding:0 8px 0 0;color:var(--demuxe-muted-foreground);font-size:11px}
.utility-actions{display:flex;align-items:center;gap:6px;flex:none;pointer-events:auto}
.time-display{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.time-display .time{overflow-wrap:anywhere}
.time-display #duration::before{content:'/';margin-right:8px;color:var(--demuxe-muted-foreground)}
/* Classic retains the original geometry and visibility model. Modern composes the
   same nodes into a dock; layout rules never choose a palette or call playback. */
.shell[data-layout=modern] .topbar{padding:14px 16px;background:none}
.shell[data-layout=modern] .topbar .utility-actions{background:var(--demuxe-panel-background);border:1px solid var(--demuxe-border);border-radius:var(--demuxe-control-radius)}
.shell[data-layout=modern] .player-title{font-size:14px;font-weight:550;letter-spacing:.15px;background:var(--demuxe-panel-background);padding:6px 12px;border:1px solid var(--demuxe-border);border-radius:var(--demuxe-control-radius)}
.shell[data-layout=modern] .controls{inset:auto 16px 16px;padding:8px 16px 12px;border:1px solid var(--demuxe-border);border-radius:var(--demuxe-radius);background:var(--demuxe-panel-background);box-shadow:0 8px 30px #0003}
.shell[data-layout=modern] .times{display:flex;align-items:center;flex-wrap:wrap;gap:12px}
.shell[data-layout=modern] .icon-button{width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px}
.shell[data-layout=modern] .transport{position:static;transform:none;translate:none;scale:1;gap:0;background:transparent;padding:0;visibility:visible;flex:none}
.shell[data-layout=modern] .transport .icon-button,.shell[data-layout=modern] .transport #back,.shell[data-layout=modern] .transport #forward{width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px;padding:10px;transform:none}
.shell[data-layout=modern] .transport .play{width:44px;flex-basis:44px;background:var(--demuxe-accent);color:var(--demuxe-background);border-radius:var(--demuxe-control-radius)}
.shell[data-layout=modern] .transport .play svg{width:24px;height:24px;filter:none}
.shell[data-layout=modern] .transport #back svg,.shell[data-layout=modern] .transport #forward svg{width:23px;height:23px}
.shell[data-layout=modern] .utility-actions{gap:2px}
.shell[data-layout=modern] .utility-actions .icon-button{width:44px;height:44px;min-width:44px;min-height:44px;flex-basis:44px;border-radius:var(--demuxe-control-radius)}
.shell[data-layout=modern] .time{font-size:12px;text-shadow:none}
.shell[data-layout=modern] .volume{width:56px}
.shell[data-layout=modern] .queue-navigation{order:8;width:100%;justify-content:center;border-top:1px solid var(--demuxe-border);padding-top:4px}
.shell[data-layout=modern] .times:has(.queue-navigation:not([hidden]))>.space{display:block}
.shell[data-layout=modern] .settings{top:auto;bottom:126px;right:16px;max-height:calc(100% - 144px);border-radius:var(--demuxe-radius)}
.shell[data-layout=modern]:has(.queue-navigation:not([hidden])) .settings{bottom:172px;max-height:calc(100% - 190px)}
.shell[data-layout=modern] .status{bottom:142px}
.shell[data-layout=modern] .diagnostics-overlay{background:var(--demuxe-panel-background);text-shadow:none}
.shell[data-layout=modern].idle.seek-preview .controls{background:var(--demuxe-panel-background)}
.shell[data-layout=modern].idle .transport,.shell[data-layout=modern].idle .utility-actions,.shell[data-layout=modern].idle .queue-navigation{opacity:0;pointer-events:none}
@container player (max-width:650px){
 .shell[data-layout=modern] .stage{min-height:340px}
 .shell[data-layout=modern] .topbar{padding:12px 16px 24px}
 .shell[data-layout=modern] .controls{inset:auto 8px 8px;padding:4px 12px 8px}
 .shell[data-layout=modern] .times{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px}
 .shell[data-layout=modern] .transport{grid-column:1;grid-row:1;justify-self:start}
 .shell[data-layout=modern] #volume-control{grid-column:2;grid-row:1;justify-self:end}
 .shell[data-layout=modern] .time-display{grid-column:1;grid-row:2;gap:4px}
 .shell[data-layout=modern] .time-display #duration::before{margin-right:4px}
 .shell[data-layout=modern] .utility-actions{grid-column:2;grid-row:2}
 .shell[data-layout=modern] #control-spacer{display:none}
 .shell[data-layout=modern] .queue-navigation{grid-column:1 / -1}
 .shell[data-layout=modern] .settings,.shell[data-layout=modern]:has(.queue-navigation:not([hidden])) .settings{top:8px;bottom:auto;right:8px;max-height:calc(100% - 24px);width:360px;max-width:calc(100% - 16px)}
 .shell[data-layout=modern] .status{bottom:160px;left:16px}
}
/* At narrow widths utilities get their own row instead of forcing the grid
   wider than its container. DOM/tab order still follows transport then volume. */
@container player (max-width:380px){
 .shell[data-layout=modern] .time-display{grid-column:1 / -1;grid-row:2}
 .shell[data-layout=modern] .utility-actions{grid-column:1 / -1;grid-row:3;justify-content:space-between}
}
:host(:fullscreen) .shell[data-layout=modern] .stage{min-height:0}
@media(forced-colors:active){.shell[data-layout=modern] .transport .play{background:ButtonFace;color:ButtonText;border:1px solid ButtonText}}
`;
