// SPDX-License-Identifier: Apache-2.0
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';

export function formatDuration(seconds){
  if(seconds===null||!Number.isFinite(seconds))return 'estimating';
  const n=Math.max(0,Math.ceil(seconds));return n>=3600?`${Math.floor(n/3600)}h ${Math.floor(n%3600/60)}m`:n>=60?`${Math.floor(n/60)}m ${n%60}s`:`${n}s`;
}
export class CampaignProgress{
  constructor({total,output,estimateSeconds=45,clock=()=>performance.now(),emit=line=>process.stderr.write(line+'\n'),heartbeat=true,env=process.env}){
    this.total=total;this.output=env.DEMUXE_PROGRESS_FILE??output;this.estimateSeconds=estimateSeconds;this.clock=clock;this.emit=emit;this.completed=0;this.durations=[];this.counts={};
    this.offset=Number(env.DEMUXE_CAMPAIGN_OFFSET??0);this.campaignTotal=Number(env.DEMUXE_CAMPAIGN_TOTAL??total);this.tailSeconds=env.DEMUXE_CAMPAIGN_TAIL_SECONDS===undefined?null:Number(env.DEMUXE_CAMPAIGN_TAIL_SECONDS);
    if(this.tailSeconds!==null&&(!Number.isFinite(this.tailSeconds)||this.tailSeconds<0))throw Error('Invalid campaign tail estimate');
    if(!Number.isInteger(total)||total<0||!Number.isInteger(this.offset)||this.offset<0||!Number.isInteger(this.campaignTotal)||this.campaignTotal<this.offset+total)throw Error('Invalid campaign progress counts');
    if(env.DEMUXE_STEP_TESTS!==undefined&&Number(env.DEMUXE_STEP_TESTS)!==total)throw Error('Campaign plan test count does not match scheduled tests');
    if(heartbeat){this.timer=setInterval(()=>this.render(),5000);this.timer.unref();}
  }
  start(label){if(this.current)throw Error('Previous progress test is unfinished');this.current={label,began:this.clock(),phase:'setup',deadline:null,tail:0};this.render();}
  phase(name,seconds=null,tail=0){if(!this.current)return;this.current.phase=name;this.current.deadline=seconds===null?null:this.clock()+seconds*1000;this.current.tail=tail;this.render();}
  snapshot(){
    const now=this.clock(),c=this.current,phaseRemaining=c?.deadline===null||!c?null:Math.max(0,(c.deadline-now)/1000);
    const typical=this.durations.length?this.durations.reduce((a,b)=>a+b,0)/this.durations.length:this.estimateSeconds;
    const testRemaining=c?(phaseRemaining===null?Math.max(0,typical-(now-c.began)/1000):phaseRemaining+c.tail):0;
    const remaining=(this.tailSeconds===null?this.campaignTotal-this.offset:this.total)-this.completed-(c?1:0);
    return {completed:this.offset+this.completed,total:this.campaignTotal,stepCompleted:this.completed,stepTotal:this.total,
      current:c?{index:this.offset+this.completed+1,label:c.label,phase:c.phase,phaseRemainingSeconds:phaseRemaining,
        estimatedRemainingSeconds:testRemaining}:null,estimatedCampaignRemainingSeconds:Math.max(0,testRemaining+remaining*typical+(this.tailSeconds??0)),counts:this.counts};
  }
  render(){const s=this.snapshot(),c=s.current;
    this.emit(`[${s.completed}/${s.total} completed] ${c?`test ${c.index}/${s.total} ${c.label} | ${c.phase}: ${formatDuration(c.phaseRemainingSeconds)} | test left ~${formatDuration(c.estimatedRemainingSeconds)}`:'idle'} | campaign left ~${formatDuration(s.estimatedCampaignRemainingSeconds)}`);
    if(this.output)writeFileSync(this.output,JSON.stringify(s,null,2)+'\n');
  }
  finish(status){if(!this.current)return;this.durations.push((this.clock()-this.current.began)/1000);this.completed++;this.counts[status]=(this.counts[status]??0)+1;this.current=null;this.render();}
  close(){clearInterval(this.timer);this.render();}
}
