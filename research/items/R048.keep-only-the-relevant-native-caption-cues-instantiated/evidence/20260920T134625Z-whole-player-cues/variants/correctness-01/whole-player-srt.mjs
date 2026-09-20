// SPDX-License-Identifier: Apache-2.0
// Identical bounded setup in every experimental arm, not production SRT admission.
export function plainSRTtoVTT(text) {
  if(text.length>8*1024*1024)throw Error('Caption byte budget');
  const blocks=text.replace(/\r\n?/g,'\n').trim().split(/\n\n+/);if(blocks.length>10000)throw Error('Cue budget');
  const body=blocks.map((b,i)=>{const lines=b.split('\n');if(lines.shift()!==String(i+1))throw Error('Cue order');const timing=lines.shift();if(!/^\d{2,}:[0-5]\d:[0-5]\d,\d{3} --> \d{2,}:[0-5]\d:[0-5]\d,\d{3}$/.test(timing)||!lines.length||lines.some(x=>/[<>&\0]/.test(x)))throw Error('Unsupported SRT');return timing.replaceAll(',','.')+'\n'+lines.join('\n');});
  return 'WEBVTT\n\n'+body.join('\n\n')+'\n';
}
