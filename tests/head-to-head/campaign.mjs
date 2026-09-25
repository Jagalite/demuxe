// SPDX-License-Identifier: Apache-2.0
// Serial multi-command campaign; each child validates its declared test count.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const [planArg,outArg]=process.argv.slice(2);
if(!planArg||!outArg)throw Error('Usage: node tests/head-to-head/campaign.mjs <plan.json> <new-output-directory>');
const plan=JSON.parse(await fs.readFile(planArg));
if(!Array.isArray(plan.steps)||!plan.steps.length)throw Error('Plan needs nonempty steps');
for(const step of plan.steps)if(!Array.isArray(step.command)||!step.command.length||step.command.some(s=>typeof s!=='string')||!Number.isInteger(step.tests)||step.tests<1)throw Error('Each step needs command string array and positive tests count');
const out=path.resolve(outArg);await fs.mkdir(out,{recursive:false});
await fs.writeFile(path.join(out,'plan.json'),JSON.stringify(plan,null,2)+'\n');
const state={startedAt:new Date().toISOString(),total:plan.steps.reduce((n,s)=>n+s.tests,0),completed:0,steps:[]};
const save=()=>fs.writeFile(path.join(out,'campaign.json'),JSON.stringify(state,null,2)+'\n');
await save();
for(const [index,step] of plan.steps.entries()){
 const progressFile=path.join(out,`step-${index+1}-progress.json`);
 const record={label:step.label??`step ${index+1}`,tests:step.tests,startedAt:new Date().toISOString()};state.steps.push(record);await save();
 console.error(`Campaign step ${index+1}/${plan.steps.length}: ${record.label}; ${state.completed}/${state.total} tests complete`);
 const child=spawn(step.command[0],step.command.slice(1),{stdio:'inherit',env:{...process.env,
  DEMUXE_CAMPAIGN_TAIL_SECONDS:String(plan.steps.slice(index+1).reduce((n,s)=>n+s.tests*(s.estimateSeconds??45),0)),
  DEMUXE_CAMPAIGN_TOTAL:String(state.total),DEMUXE_CAMPAIGN_OFFSET:String(state.completed),DEMUXE_STEP_TESTS:String(step.tests),DEMUXE_PROGRESS_FILE:progressFile}});
 const exit=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(code,signal)=>resolve({code,signal}));});
 Object.assign(record,exit,{finishedAt:new Date().toISOString()});
 const progress=JSON.parse(await fs.readFile(progressFile).catch(()=>Buffer.from('{}')));
 record.completed=progress.stepCompleted??0;state.completed+=record.completed;await save();
 if(exit.signal||![0,1].includes(exit.code)||record.completed!==step.tests)throw Error('Campaign stopped: incomplete runner or setup failure in '+record.label);
}
state.finishedAt=new Date().toISOString();await save();console.log(`Campaign complete: ${state.completed}/${state.total} attempted (see per-test outcomes)`);
