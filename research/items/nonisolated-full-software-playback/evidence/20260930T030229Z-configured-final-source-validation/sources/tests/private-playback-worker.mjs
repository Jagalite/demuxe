// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/private-mpv/playback-worker.js',import.meta.url),'utf8');
const pump=source.slice(source.indexOf('async function pump()'),source.indexOf('function close()'));
function session(host,opening,target,baseline){
 const make=new Function('host','post','diagnostics','fail','setTimeout',`
 let closing=false,replacing=false,pumping=false,restarted=false,contextRunning=true,userPaused=true,generation=1,timer;
 let target=${target},opening=${opening},lastDraws=${baseline},targetDrawBaseline=${baseline};
 const commands=new Map();
 ${pump}
 return {pump,target:()=>target};`);
 return make(host,()=>{},async()=>{},async error=>{throw error;},()=>0);
}
for(const opening of [true,false])test('frame preceding playback-restart satisfies '+(opening?'file':'seek')+' output readiness',async()=>{
 let step=0;const host={draws:4,properties:{'time-pos':2.5},async pump(){step++;this.draws=5;return step===2?[{event:'playback-restart'}]:[];}};
 const state=session(host,opening,opening?0:2.5,4);await state.pump();assert.notEqual(state.target(),undefined);
 await state.pump();assert.equal(state.target(),undefined);
});
test('a seek cannot finish on a picture at another position',async()=>{
 const host={draws:4,properties:{'time-pos':1.5},async pump(){this.draws=5;return [{event:'playback-restart'}];}};
 const state=session(host,false,2.5,4);await state.pump();assert.equal(state.target(),2.5);
 host.properties['time-pos']=2.5;await state.pump();assert.equal(state.target(),undefined);
});
test('native decoder failure reaches fatal cleanup instead of an output timeout',async()=>{
 const host={draws:0,properties:{},async pump(){return [{event:'end-file',reason:'error',error:'unsupported format'}];}};
 await assert.rejects(session(host,true,0,0).pump(),/Private Software decode failed: unsupported format/);
});
test('ordinary EOF remains a playback event',async()=>{
 const host={draws:5,properties:{'time-pos':4},async pump(){return [{event:'end-file',reason:'eof'}];}};
 await session(host,false,4,4).pump();
});
