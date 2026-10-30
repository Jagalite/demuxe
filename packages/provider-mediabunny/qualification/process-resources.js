// SPDX-License-Identifier: Apache-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
export function cpuSeconds(value){
  const match=/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/.exec(value);
  if(!match)throw Error('Unrecognized process CPU time');
  return Number(match[1]??0)*86400+Number(match[2]??0)*3600+Number(match[3])*60+Number(match[4]);
}
export function processTree(table,rootPid){
  const rows=table.trim().split('\n').filter(Boolean).map(line=>{
    const match=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d:.\-]+)\s*$/.exec(line);
    if(!match)throw Error('Unrecognized process resource row');
    return {pid:Number(match[1]),parent:Number(match[2]),rssBytes:Number(match[3])*1024,cpuSeconds:cpuSeconds(match[4])};
  });
  const ids=new Set([rootPid]);let changed;
  do{changed=false;for(const row of rows)if(ids.has(row.parent)&&!ids.has(row.pid)){ids.add(row.pid);changed=true;}}while(changed);
  const result=rows.filter(row=>ids.has(row.pid));
  if(!result.some(row=>row.pid===rootPid))throw Error('Browser root process is missing');
  return result;
}
/** Sampled aggregate RSS sums shared pages; CPU retains observed maxima for
 * exited children. Neither is an exact physical-memory or complete CPU census. */
export async function sampleBrowser(rootPid){
  const {stdout}=await execute('ps',['-axo','pid=,ppid=,rss=,time='],{maxBuffer:16*1024*1024});
  return processTree(stdout,rootPid);
}
export function resourceLedger(){
  const cpu=new Map();let peakAggregateRssBytes=0,samples=0;
  return {observe(rows){
    let rss=0;for(const row of rows){rss+=row.rssBytes;cpu.set(row.pid,Math.max(cpu.get(row.pid)??0,row.cpuSeconds));}
    peakAggregateRssBytes=Math.max(peakAggregateRssBytes,rss);samples++;
    return {aggregateRssBytes:rss,observedCpuSeconds:[...cpu.values()].reduce((sum,value)=>sum+value,0),processes:rows.length,samples,peakAggregateRssBytes};
  }};
}
