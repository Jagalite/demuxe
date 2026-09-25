// SPDX-License-Identifier: Apache-2.0
// Summarize only accepted, matched full-playback rounds.
import fs from 'node:fs/promises';
import path from 'node:path';

if(!process.env.INPUT)throw Error('Set INPUT to a matrix case result JSON');
const input=path.resolve(process.env.INPUT);
const out=path.resolve(process.env.OUTPUT??path.join(path.dirname(input),'analysis.json'));
const raw=JSON.parse(await fs.readFile(input,'utf8'));
const ids=['A','B','C'],roles=['browser','renderer','gpu','audioService','other'];
const rounds=[];
for(let n=1;n<=raw.protocol.rounds;n++){
 const trials=raw.trials.filter(t=>t.round===n);
 if(trials.length!==3||trials.some(t=>t.status!=='accepted')||ids.some(id=>trials.filter(t=>t.arm===id).length!==1))throw Error(`Round ${n} incomplete or rejected`);
 const byId=Object.fromEntries(trials.map(t=>[t.arm,t]));
 if(new Set(trials.map(t=>t.browserVersion)).size!==1)throw Error(`Round ${n} Chrome build mismatch`);
 if(new Set(ids.map(id=>raw.fixtureFiles[id].sha256)).size!==1)throw Error('Fixture bytes differ');
 if(byId.C.webCodecs?.visibleCanvasDraws!==0||byId.B.webCodecs?.visibleCanvasDraws<byId.B.elapsed*raw.fixtureFiles.B.fps*.9)throw Error(`Round ${n} draw ablation invalid`);
 rounds.push(byId);
}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
const summary=values=>({median:median(values),range:[Math.min(...values),Math.max(...values)],rounds:values});
const metric=(trial,key)=>key==='whole'?trial.cpu.whole:trial.cpu.roles[key];
const arms=Object.fromEntries(ids.map(id=>[id,Object.fromEntries(['whole',...roles].map(key=>[key,summary(rounds.map(row=>metric(row[id],key)))]))]));
const pairs={};
for(const [name,plus,minus] of [['hybridTax','B','A'],['visibleUpperBound','B','C'],['residual','C','A']]){
 const deltas=Object.fromEntries(['whole',...roles].map(key=>[key,summary(rounds.map(row=>metric(row[plus],key)-metric(row[minus],key)))]));
 pairs[name]={plus,minus,deltas,relativeMedianPercent:median(rounds.map(row=>100*(row[plus].cpu.whole-row[minus].cpu.whole)/row[minus].cpu.whole))};
}
const counters=Object.fromEntries(['B','C'].map(id=>[id,Object.fromEntries(['submitted','outputs','received','draws','visibleCanvasDraws','closed','missing','peakRetained','peakPending','packetBytes','decoderCopyMs'].map(key=>[key,summary(rounds.map(row=>row[id].webCodecs[key]))]))]));
const result={schema:1,source:input,rounds:rounds.length,fixtureSha256:raw.fixtureFiles.A.sha256,browserVersion:rounds[0].A.browserVersion,
 arms,pairs,counters,orders:raw.protocol.orders};
await fs.writeFile(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rounds:result.rounds,arms:Object.fromEntries(ids.map(id=>[id,arms[id].whole.median])),
 pairs:Object.fromEntries(Object.entries(pairs).map(([name,p])=>[name,p.deltas.whole]))},null,2));
