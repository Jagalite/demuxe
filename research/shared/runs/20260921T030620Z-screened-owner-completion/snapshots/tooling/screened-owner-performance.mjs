// SPDX-License-Identifier: Apache-2.0
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {serveLab,profiles,playerTrial} from './screened-owner-lab.mjs';
const context=JSON.parse(await readFile(process.argv[2],'utf8'));
const correctness=JSON.parse(await readFile(context.run+'/'+(process.env.CORRECTNESS||'correctness-v3/results.json'),'utf8'));
if(!correctness.passed)throw Error('Correctness prerequisite failed');
const out=context.run+'/'+(process.env.VARIANT||'performance');await mkdir(out,{recursive:true});
const server=await serveLab(context),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const result={browser:browser.version(),sampling:'Seven alternating pairs, no discarded trials',profiles:[]};
const save=()=>writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n');
const median=x=>{const a=[...x].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
let seed=7321;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
function summary(pairs,key){const ratios=pairs.map(p=>p.candidate[key]/p.reference[key]),draws=[];for(let i=0;i<10000;i++)draws.push(median(ratios.map(()=>ratios[Math.floor(rand()*ratios.length)])));draws.sort((a,b)=>a-b);return {medianRatio:median(ratios),bootstrap95:[draws[250],draws[9750]],candidateMedianMs:median(pairs.map(p=>p.candidate[key])),referenceMedianMs:median(pairs.map(p=>p.reference[key])),pairedRatios:ratios};}
try{
 const cdp=await browser.newBrowserCDPSession();result.processesBefore=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
 for(const profile of (process.env.PROFILES?JSON.parse(await readFile(process.env.PROFILES,'utf8')):profiles(context))){
  const row={id:profile.id,pairs:[]};result.profiles.push(row);
  for(let i=0;i<7;i++){
   const pair={index:i,order:i%2?['candidate','reference']:['reference','candidate']};row.pairs.push(pair);
   try{for(const arm of pair.order)pair[arm]=await playerTrial(browser,server,profile,arm==='candidate');}
   catch(e){pair.error=String(e.stack);row.failed=true;await save();break;}
   await save();console.log(profile.id,'pair',i+1,pair.candidate.totalMs.toFixed(1),pair.reference.totalMs.toFixed(1));
  }
  if(!row.failed){row.total=summary(row.pairs,'totalMs');row.startup=summary(row.pairs,'startupMs');row.passed=row.total.medianRatio<=1.15&&row.startup.medianRatio<=1.25;}
  console.log(profile.id,'PERFORMANCE',row.passed?'PASS':'STOP');await save();
 }
 result.processesBeforeClose=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
}finally{result.assets=[...server.assets.values()];await browser.close();await server.close();result.browserClosed=true;await save();}
