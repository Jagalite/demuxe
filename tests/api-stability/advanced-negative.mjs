// SPDX-License-Identifier: Apache-2.0
// Deliberately remove reviewed guards in an isolated CI runtime, prove that the
// behavioral regressions fail, and restore the original bytes unconditionally.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const mutations=[
  {file:'web/generated/player/advanced-settings.js',replacements:[
    ['this.getPlayer() !== p || p.isDestroyed || p.state.sourceId !== source || !this.root.host.isConnected','this.getPlayer() !== p || !this.root.host.isConnected'],
    ['this.getPlayer() === p && !p.isDestroyed && p.state.sourceId === source && this.root.host.isConnected','this.getPlayer() === p && p.state.sourceId === source'],
  ]},
  {file:'web/generated/internal/machine/advanced-controls.js',replacements:[
    ['current.ownerId === null || command.destroyed || !command.connected || command.pending || current.busy','current.ownerId === null || command.pending || current.busy'],
    ['facts.destroyed || state.busy || facts.pending','state.busy || facts.pending'],
  ]},
];
const originals=new Map(await Promise.all(mutations.map(async({file})=>[file,await readFile(file,'utf8')])));
const out=`results/api-stability/advanced-negative/${process.env.BROWSER??'chromium'}`;await mkdir(out,{recursive:true});
const mutants=mutations.map(({file,replacements})=>{
  let mutant=originals.get(file);
  for(const [before,after]of replacements){assert.equal(mutant.split(before).length,2,'Mutation anchor changed; review the negative control');mutant=mutant.replace(before,after);}
  return [file,mutant];
});
try{
  await Promise.all(mutants.map(([file,mutant])=>writeFile(file,mutant)));
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--import','./tests/api-stability/browser-guard.mjs','tests/api-stability/advanced-settings.mjs'],{detached:true,stdio:'inherit',env:{...process.env,API_ADVANCED_OUTPUT:out,API_GUARD_REPORT:out+'/guard.json'}});
    let timedOut=false;
    const terminate=()=>{try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}};
    const timer=setTimeout(()=>{timedOut=true;terminate();},120000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',(code,signal)=>{clearTimeout(timer);terminate();resolve({code,signal,timedOut});});
  });
  assert.equal(result.timedOut,false);assert.equal(result.code,1,'Unguarded implementation unexpectedly passed');
  const report=JSON.parse(await readFile(out+'/result.json','utf8'));
  const guard=JSON.parse(await readFile(out+'/guard.json','utf8'));
  assert.ok(guard.pages>0);assert.deepEqual(guard.errors,[]);
  assert.equal(report.checks.length,24);assert.deepEqual(report.pageErrors,[]);
  const failed=report.checks.filter(c=>!c.passed).map(c=>c.name).sort();
  assert.deepEqual(failed,[
    'idle, terminal, feature availability and accessible labels',
    'late snapshot from a retired source never starts a download',
    'detached controls cannot dispatch owner operations',
    'pending output permission cannot modify a detached or replaced source',
  ].sort());
  await writeFile(out+'/negative-control.json',JSON.stringify({passed:true,detected:failed},null,2)+'\n');
}finally{await Promise.all([...originals].map(([file,original])=>writeFile(file,original)));}
