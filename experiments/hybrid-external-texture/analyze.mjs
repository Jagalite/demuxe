// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
const root='results/hybrid-external-texture/three-pairs';
const raw=JSON.parse(await fs.readFile(`${root}/h264-1080p60-960x540-result.json`));
const median=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
const keys=['whole','browser','renderer','gpu','audioService','other'];
const get=(t,k)=>k==='whole'?t.cpu.whole:t.cpu.roles[k];
const rounds=[];
for(let i=1;i<=raw.protocol.rounds;i++){
 const pair=raw.trials.filter(t=>t.round===i);
 if(pair.length!==2||pair.some(t=>t.status!=='accepted')||new Set(pair.map(t=>t.arm)).size!==2)
  throw Error(`Pair ${i} is incomplete or failed`);
 const B=pair.find(t=>t.arm==='B'),D=pair.find(t=>t.arm==='D');
 if(!B||!D||B.browserVersion!==D.browserVersion||D.presenter?.kind!=='webgpu-external-texture')throw Error('Pair mismatch');
 rounds.push({round:i,B,D,difference:Object.fromEntries(keys.map(k=>[k,get(D,k)-get(B,k)]))});
}
const output={comparison:'WebGPU external texture minus Canvas2D; negative favors WebGPU',
 fixtureSha256:raw.fixtureFiles.B.sha256,browserVersion:rounds[0].B.browserVersion,
 arms:Object.fromEntries(['B','D'].map(id=>[id,Object.fromEntries(keys.map(k=>[k,median(rounds.map(r=>get(r[id],k)))]))])),
 paired:Object.fromEntries(keys.map(k=>[k,{median:median(rounds.map(r=>r.difference[k])),rounds:rounds.map(r=>r.difference[k])}])),
 relativeMedianPercent:median(rounds.map(r=>100*r.difference.whole/r.B.cpu.whole)),
 trials:raw.trials.map(t=>({arm:t.arm,round:t.round,status:t.status,whole:t.cpu.whole,roles:t.cpu.roles,elapsed:t.elapsed,
  route:t.route,decoder:t.decoder,webCodecs:t.webCodecs,presenter:t.presenter,advance:t.advance,
  underruns:t.audioWorklet.underruns,driftMs:t.audioWorklet.mediaVsVideoDriftMs,worker:t.worker,
  mpvDrops:t.mpv.end['frame-drop-count'],mpvDecoderDrops:t.mpv.end['decoder-frame-drop-count'],surface:t.endState.surface}))};
await fs.writeFile(`${root}/analysis.json`,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({arms:output.arms,paired:output.paired,relative:output.relativeMedianPercent},null,2));
