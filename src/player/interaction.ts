// SPDX-License-Identifier: GPL-3.0-or-later
export function formatTime(value:number):string {
  const n=Math.max(0,Math.floor(value)),seconds=String(n%60).padStart(2,'0'),minutes=String(Math.floor(n/60)%60).padStart(2,'0');
  return n>=3600?`${Math.floor(n/3600)}:${minutes}:${seconds}`:`${Math.floor(n/60)}:${seconds}`;
}
export function outputDimensions(ratio:number) {const width=Math.min(1920,1080*ratio);return {width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(width/ratio))};}
export function shortcut(event:KeyboardEvent,spaceControlsPlayback=false):string|null {
  if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.defaultPrevented)return null;
  if(event.composedPath().some(node=>node instanceof HTMLElement&&(node.matches('input,select,textarea,[role="slider"]')||node.isContentEditable)))return null;
  if((event.key==='Enter'||event.key===' '&&!spaceControlsPlayback)&&event.composedPath().some(node=>node instanceof HTMLElement&&node.matches('button,a,summary,[role="button"]')))return null;
  return event.key.toLowerCase();
}
