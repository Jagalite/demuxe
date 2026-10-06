// SPDX-License-Identifier: Apache-2.0
export function formatTime(value:number):string {
  const n=Math.max(0,Math.floor(value)),seconds=String(n%60).padStart(2,'0'),minutes=String(Math.floor(n/60)%60).padStart(2,'0');
  return n>=3600?`${Math.floor(n/3600)}:${minutes}:${seconds}`:`${Math.floor(n/60)}:${seconds}`;
}
export function outputDimensions(ratio:number) {const width=Math.min(1920,1080*ratio);return {width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(width/ratio))};}
/** UI seeks follow the requested direction across holes and stay inside the current window. */
export function resolveSeekTarget(time:number,ranges:readonly {start:number;end:number}[]|null,position:number,limit?:{start:number;end:number}|null):number|null {
  if(!Number.isFinite(time))return null;
  const windows=(ranges??[]).map(r=>({start:Math.max(r.start,limit?.start??0),end:Math.min(r.end,limit?.end??Infinity)}))
    .filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).sort((a,b)=>a.start-b.start);
  if(!windows.length)return null;
  const end=(r:{start:number;end:number})=>Math.max(r.start,r.end-.05);
  for(let i=0;i<windows.length;i++){
    const range=windows[i];
    if(time<range.start)return i===0||time>=position?range.start:end(windows[i-1]);
    if(time<=range.end)return Math.max(range.start,Math.min(time,end(range)));
  }
  return end(windows[windows.length-1]);
}
export function shortcut(event:KeyboardEvent,spaceControlsPlayback=false):string|null {
  if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||event.defaultPrevented)return null;
  if(event.composedPath().some(node=>node instanceof HTMLElement&&(node.matches('input,select,textarea,[role="slider"]')||node.isContentEditable)))return null;
  if((event.key==='Enter'||event.key===' '&&!spaceControlsPlayback)&&event.composedPath().some(node=>node instanceof HTMLElement&&node.matches('button,a,summary,[role="button"]')))return null;
  return event.key.toLowerCase();
}
