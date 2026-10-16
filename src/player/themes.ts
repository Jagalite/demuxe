// SPDX-License-Identifier: Apache-2.0
export const playerThemes = ['demuxe','light','oled','contrast','paper','terminal'] as const;
export type PlayerTheme = typeof playerThemes[number];
export function isPlayerTheme(value:unknown):value is PlayerTheme {
  return typeof value==='string'&&(playerThemes as readonly string[]).includes(value);
}
/** Eased scrim gradient: solid behind controls, fading smoothly into the picture. */
export const scrimGradient = (direction:string, solid='0%') => `linear-gradient(${direction},var(--demuxe-scrim-background) ${solid},${[[74,19],[54,34],[38,47],[28,56],[19,65],[13,73],[8,80],[4,86],[2,91]].map(([alpha,at])=>`color-mix(in srgb,var(--demuxe-scrim-background) ${alpha}%,transparent) calc(${solid} + (100% - ${solid})*${at/100})`).join(',')},transparent)`;
// Light palettes share the legibility rules for chrome drawn over footage.
const light = (selector:string) => `:host([theme=light]) ${selector},:host([theme=paper]) ${selector}`;
export const themeStyles = `
/* Theme defaults live on the host; consumer host declarations win across shadow DOM. */
:host{--demuxe-background:#101114;--demuxe-foreground:#f6f3ed;--demuxe-accent:#f3ead8;--demuxe-border:#ffffff24;--demuxe-radius:14px;--demuxe-stage-background:#08090c;--demuxe-muted-foreground:#b8bbc3;--demuxe-panel-background:#151619;--demuxe-control-background:#25262b;--demuxe-overlay-background:#30343b70;--demuxe-color-scheme:dark;--demuxe-font:14px/1.5 system-ui,sans-serif;--demuxe-control-radius:8px;--demuxe-highlight:#ffb454;--demuxe-live:#ff4646;--demuxe-scrim-background:rgb(8 9 12 / .82);font:var(--demuxe-font);
  /* Motion: enter decelerates, exit accelerates, press overshoots slightly. */
  --demuxe-motion-ease:cubic-bezier(.22,1,.36,1);--demuxe-motion-ease-exit:cubic-bezier(.4,0,1,1);--demuxe-motion-ease-press:cubic-bezier(.34,1.4,.64,1);--demuxe-motion-quick:120ms;--demuxe-motion-base:220ms;--demuxe-motion-slow:320ms;--demuxe-motion-scale:1;--demuxe-motion-distance:6px;--demuxe-motion-stagger:25ms}
:host([theme=light]){--demuxe-background:#f4f3ee;--demuxe-foreground:#1c2529;--demuxe-muted-foreground:#4d5a60;--demuxe-accent:#006b61;--demuxe-border:#23343a30;--demuxe-panel-background:#faf9f5;--demuxe-control-background:#e4e8e3;--demuxe-overlay-background:#f4f3eef5;--demuxe-color-scheme:light;--demuxe-highlight:#b25e00;--demuxe-live:#c8102e;--demuxe-scrim-background:rgb(244 243 238 / .94)}
/* OLED: true black surfaces and slower, softer fades for dark rooms. */
:host([theme=oled]){--demuxe-scrim-background:rgb(0 0 0 / .84);--demuxe-background:#000;--demuxe-foreground:#fff;--demuxe-muted-foreground:#a3a3a3;--demuxe-accent:#fff;--demuxe-border:#ffffff26;--demuxe-stage-background:#000;--demuxe-panel-background:#000;--demuxe-control-background:#161616;--demuxe-overlay-background:#000000b3;--demuxe-motion-ease:cubic-bezier(.4,0,.2,1);--demuxe-motion-ease-exit:cubic-bezier(.4,0,.6,1);--demuxe-motion-ease-press:cubic-bezier(.4,0,.2,1);--demuxe-motion-quick:180ms;--demuxe-motion-base:360ms;--demuxe-motion-slow:520ms;--demuxe-motion-distance:0px;--demuxe-motion-stagger:40ms;--demuxe-motion-hidden-scale:1;--demuxe-motion-panel-scale:1;--demuxe-waiting-animation:waiting-breathe 2.4s cubic-bezier(.4,0,.6,1) infinite}
/* Contrast: maximum contrast, solid outlines and near-instant motion. */
:host([theme=contrast]){--demuxe-scrim-background:rgb(0 0 0 / .92);--demuxe-background:#000;--demuxe-foreground:#fff;--demuxe-muted-foreground:#fff;--demuxe-accent:#ffd400;--demuxe-border:#fff;--demuxe-stage-background:#000;--demuxe-panel-background:#000;--demuxe-control-background:#000;--demuxe-overlay-background:#000000eb;--demuxe-highlight:#ffd400;--demuxe-live:#ff5c5c;--demuxe-motion-quick:0ms;--demuxe-motion-base:0ms;--demuxe-motion-slow:0ms;--demuxe-motion-distance:0px;--demuxe-motion-stagger:0ms;--demuxe-motion-hidden-scale:1;--demuxe-motion-panel-scale:1;--demuxe-waiting-animation:busy-turn 1.6s steps(8,end) infinite;--demuxe-busy-animation:busy-turn 1.6s steps(8,end) infinite}
/* Paper: a warm editorial palette for article embeds. */
:host([theme=paper]){--demuxe-scrim-background:rgb(243 239 230 / .95);--demuxe-background:#f3efe6;--demuxe-foreground:#2a2620;--demuxe-muted-foreground:#5f584c;--demuxe-accent:#a63d26;--demuxe-border:#2a262030;--demuxe-panel-background:#faf7f0;--demuxe-control-background:#e7e0d1;--demuxe-overlay-background:#f3efe6f2;--demuxe-stage-background:#1b1916;--demuxe-color-scheme:light;--demuxe-highlight:#a63d26;--demuxe-live:#a63d26;--demuxe-font:14px/1.5 Charter,'Iowan Old Style','Palatino Linotype',Georgia,serif;--demuxe-motion-ease:cubic-bezier(.2,.8,.2,1);--demuxe-motion-ease-exit:cubic-bezier(.5,0,.75,0);--demuxe-motion-ease-press:cubic-bezier(.2,.8,.2,1);--demuxe-motion-quick:140ms;--demuxe-motion-base:260ms;--demuxe-motion-slow:420ms;--demuxe-motion-distance:10px;--demuxe-motion-stagger:35ms;--demuxe-motion-panel-scale:1}
/* Terminal: phosphor monospace chrome with stepped motion. */
:host([theme=terminal]){--demuxe-scrim-background:rgb(5 13 7 / .86);--demuxe-background:#050d07;--demuxe-foreground:#7dff9a;--demuxe-muted-foreground:#4fae66;--demuxe-accent:#7dff9a;--demuxe-border:#7dff9a40;--demuxe-stage-background:#000;--demuxe-panel-background:#07130a;--demuxe-control-background:#0d2113;--demuxe-overlay-background:#050d07d9;--demuxe-highlight:#e8ff7d;--demuxe-live:#ff6b5c;--demuxe-radius:4px;--demuxe-control-radius:2px;--demuxe-font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;--demuxe-motion-ease:steps(4,end);--demuxe-motion-ease-exit:steps(2,end);--demuxe-motion-ease-press:steps(2,end);--demuxe-motion-quick:100ms;--demuxe-motion-base:200ms;--demuxe-motion-slow:280ms;--demuxe-motion-distance:0px;--demuxe-motion-stagger:45ms;--demuxe-motion-hidden-scale:1;--demuxe-motion-panel-scale:1;--demuxe-motion-panel-clip:inset(0 0 100% 0);--demuxe-busy-animation:cursor-blink 1s steps(1,end) infinite;--demuxe-waiting-animation:cursor-blink 1s steps(1,end) infinite}
button{border-radius:var(--demuxe-control-radius)}
${light('.controls')},${light('.topbar')}{background:var(--demuxe-overlay-background)}
${light('.time')},${light('.diagnostics-overlay')}{text-shadow:none}
${light('.icon-button svg')}{filter:none}
${light('.transport')}{background:var(--demuxe-overlay-background);border-radius:var(--demuxe-radius);padding:8px}
:host([theme=contrast]) .icon-button,:host([theme=contrast]) .chip{border:2px solid var(--demuxe-foreground)}
:host([theme=contrast]) .controls,:host([theme=contrast]) .topbar,:host([theme=contrast]) .transport{background:var(--demuxe-overlay-background)}
:host([theme=contrast]) .time,:host([theme=contrast]) .icon-button svg{text-shadow:none;filter:none}
:host([theme=contrast]) .timeline{--timeline-thumb-size:18px}
:host([theme=contrast]) :focus-visible{outline:3px solid var(--demuxe-accent)!important;outline-offset:3px}
:host([theme=terminal]) .icon-button svg{filter:drop-shadow(0 0 3px #7dff9a66)}
:host([theme=terminal]) .time,:host([theme=terminal]) .player-title{text-shadow:0 0 6px #7dff9a80}
:host([theme=terminal]) :is(.topbar,.controls,.settings)::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:repeating-linear-gradient(#0000 0 2px,#00000014 2px 3px)}
/* Paper: panels lift like a sheet; waiting is two alternating ink dots. */
:host([theme=paper]) .settings,:host([theme=paper]) .notice{box-shadow:0 18px 40px #2a26201f,0 2px 6px #2a262014}
@starting-style{:host([theme=paper]) .settings:not([hidden]),:host([theme=paper]) .notice:not([hidden]){box-shadow:0 2px 4px #2a262000}}
:host([theme=paper]) .buffering-indicator span{width:8px;height:8px;border:0;border-radius:50%;background:transparent;color:var(--demuxe-foreground);filter:none;box-shadow:-14px 0 0 0 currentColor,14px 0 0 0 color-mix(in srgb,currentColor 25%,transparent);animation:ink-dots 1.1s cubic-bezier(.4,0,.6,1) infinite}
/* Terminal: chrome wipes on a scanline instead of sliding; waiting is a block cursor. */
:host([theme=terminal]) .topbar,:host([theme=terminal]) .controls{clip-path:inset(0)}
:host([theme=terminal]) .shell:not(:is([data-layout=studio],[data-layout=deck])).idle .topbar{clip-path:inset(0 0 100% 0)}:host([theme=terminal]) .shell:not(:is([data-layout=studio],[data-layout=deck])).idle:not(.seek-preview) .controls{clip-path:inset(100% 0 0 0)}
:host([theme=terminal]) .buffering-indicator span,:host([theme=terminal]) .busy:not([data-complete=true])::before{width:.6em;height:1.1em;border:0;border-radius:0;background:var(--demuxe-accent);filter:drop-shadow(0 0 4px #7dff9a99)}
:host([theme=terminal]) .buffering-indicator span{width:14px;height:24px}
/* OLED: pure fades, nothing slides across a dark picture. */
:host([theme=oled]) .buffering-indicator span{border-width:1.5px;filter:none}
/* Forced colors drop shadows and author backgrounds; system colors keep themed waiting shapes visible. */
@media(forced-colors:active){:host(:is([theme=paper],[theme=terminal])) .buffering-indicator span,:host([theme=terminal]) .busy:not([data-complete=true])::before{background:CanvasText;box-shadow:none}}
`;
