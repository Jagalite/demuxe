// SPDX-License-Identifier: Apache-2.0
// Match the modal presentation to the viewport, including touch landscape.
export const mobileControlsQuery = '(max-width:600px), (pointer:coarse) and (max-width:960px)';
export type PlayerControlsMode = 'auto' | 'mobile' | 'desktop';
// Share the same rules between explicit mobile mode and automatic detection.
const mobileRules = `
 #shell .icon-button{width:48px;height:48px;min-width:48px;min-height:48px;flex-basis:48px}
 #shell .utility-actions{gap:4px}
 #shell .utility-actions #open-menu,#shell .utility-actions #diagnostics-toggle{display:none}
 #shell .topbar{padding-top:max(6px,env(safe-area-inset-top));padding-left:max(8px,env(safe-area-inset-left));padding-right:max(8px,env(safe-area-inset-right))}
 #shell .controls{padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right));padding-bottom:max(8px,env(safe-area-inset-bottom))}
 #shell .time{font-size:12px}
 #shell .timeline{height:48px;min-height:48px;--timeline-thumb-size:20px}
 #shell .volume{display:none}
 #shell .transport{gap:12px}
 #shell .transport #back,#shell .transport #forward{width:48px;height:48px;min-width:48px;min-height:48px;flex-basis:48px}
 #shell .transport .play{width:64px;height:64px;min-width:64px;min-height:64px;flex-basis:64px}
 #shell .transport .play svg{width:36px;height:36px}
 #shell[data-layout=classic]:not(:popover-open) .transport{top:45%}
 #shell[data-layout=rail] .transport{flex-direction:row;left:50%;top:42%;transform:translate(-50%,-50%);padding:4px}
 #shell[data-layout=rail] .transport .play{order:0}
 #shell[data-layout=focus] .transport{bottom:116px}
 #shell[data-layout=deck] .transport{column-gap:4px}
 #shell #settings:modal{position:fixed;inset:auto 0 0;margin:0 auto;width:100%;max-width:600px;max-height:85dvh;padding:4px max(20px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));border-radius:20px 20px 0 0;font-size:14px;overscroll-behavior:contain;transform:none;translate:none;scale:1}
 #shell #settings:modal header{top:-4px;min-height:56px}
 #shell #settings:modal header strong{font-size:16px}
 #shell #settings:modal .setting-row{min-height:56px}
 #shell #settings:modal input:not([type=checkbox]),#shell #settings:modal select{font-size:16px;min-height:48px}
 #shell #settings:modal button,#shell #settings:modal summary{min-height:48px}
 #shell #settings:modal .help{font-size:13px}
 #shell #settings:modal .mobile-menu-actions{display:grid;grid-template-columns:1fr;gap:8px;margin:16px 0}
 #shell #settings:modal .mobile-menu-actions button{text-align:left;font-size:14px}
 #shell #settings:modal .check{min-height:48px}
 #shell.menu-open .transport{visibility:hidden}
`;
const portraitRules = `
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open){display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto}
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open) .stage{grid-area:1/1/2/2}
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open) .topbar{grid-area:1/1/2/2}
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open) .transport{grid-area:1/1/2/2;top:50%}
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open) .controls{grid-area:2/1;position:relative;inset:auto;padding-top:4px;background:var(--demuxe-panel-background)}
 :host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open).idle .controls,:host(:not(:fullscreen)) #shell[data-layout=classic]:not(:popover-open).idle .controls *{opacity:1;visibility:visible;translate:none;pointer-events:auto}
`;
export const mobileStyles = `
.settings{margin:0;left:auto}
.settings::backdrop{background:#0009}
.settings:modal>.notice{position:relative;inset:auto;margin:12px 0;max-width:100%}
.settings:modal>.notice span{min-width:0}
.settings:modal>.status:not(.sr){position:relative;inset:auto;max-width:100%;margin:8px 0}
.mobile-menu-actions{display:none}
.scrub-position{position:absolute;z-index:3;transform:translate(-50%,-100%);pointer-events:none;min-width:76px;padding:8px 12px;border:1px solid var(--demuxe-border);border-radius:8px;background:var(--demuxe-panel-background);color:var(--demuxe-foreground);font:600 14px/1.4 ui-monospace,monospace;text-align:center;white-space:nowrap}
.controls:has(.scrub-position:not([hidden])) .thumbnail-preview{display:none}
.timeline{touch-action:none}
.stage{touch-action:manipulation}

@media(pointer:coarse){
 :host(:not([controls-mode=desktop])) .timeline{height:48px;min-height:48px;--timeline-thumb-size:20px}
 button,select,summary{touch-action:manipulation}
}
${mobileRules.replaceAll('#shell', ':host([controls-mode=mobile]) #shell')}
@media ${mobileControlsQuery}{
 ${mobileRules.replaceAll('#shell', ':host(:not([controls-mode=desktop])) #shell')}
}
@media(orientation:portrait){
 ${portraitRules.replaceAll(':host(:not(:fullscreen))', ':host([controls-mode=mobile]:not(:fullscreen))')}
}
@media(max-width:600px) and (orientation:portrait){
 ${portraitRules.replaceAll(':host(:not(:fullscreen))', ':host(:not([controls-mode=desktop]):not(:fullscreen))')}
}
`;
