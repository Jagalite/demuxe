// SPDX-License-Identifier: Apache-2.0
// Test-only lifecycle run. Raw samples are retained even when a gate fails.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from '../../tests/head-to-head/server.mjs';

const root=path.resolve('build/selective-audio-timeline/assets');
const out=path.resolve(process.env.OUT??`results/selective-audio-timeline/qualify-${Date.now()}`);
await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['poc.html','poc.mjs'])await fs.copyFile(path.join(import.meta.dirname,file),path.join(harness,file));
const server=await serve(root,harness,path.join(out,'requests.jsonl'));
const result={createdAt:new Date().toISOString(),browser:null,phases:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
try{
  result.browser=browser.version();
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  page.on('pageerror',error=>result.errors.push('page: '+String(error)));
  await page.goto(server.origin+'/harness/poc.html');await page.waitForFunction(()=>window.poc);
  await page.evaluate(()=>poc.start('C'));
  async function phase(name,method,arg,ms){
    const began=Date.now();
    try{if(method)await page.evaluate(({method,arg})=>poc[method](...arg),{method,arg});
      await page.waitForTimeout(ms);
      const state=await page.evaluate(()=>poc.snapshot());
      result.phases.push({name,began,ended:Date.now(),state});
      console.log(name,JSON.stringify({time:state.position,errorMs:state.clock?.errorMs,
        preEof:state.preEofUnderruns,postEof:state.postEofDrainCallbacks,
        dropped:state.video?.dropped,corrections:state.corrections?.length,errors:state.errors}));
    }catch(error){result.errors.push(name+': '+String(error));console.error(name,String(error));throw error;}
    finally{result.samples=await page.evaluate(()=>poc.samples()).catch(()=>[]);
      await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));}
  }
  await phase('steady 1x',null,[],5500);
  await phase('transition to 1.5x','rate',[1.5],5000);
  await phase('transition back 1x','rate',[1],4000);
  await phase('pause','pause',[],2500);
  await phase('resume','resume',[],3500);
  await phase('forward seek','seek',[18],2600);
  await phase('backward seek','seek',[4],2600);
  await phase('pause before paused seek','pause',[],400);
  await phase('paused seek','seek',[8],1000);
  await phase('repeat nearby paused seek','seek',[8.4],1000);
  await phase('resume after paused seeks','resume',[],2200);
  await phase('transition to 1.75x','rate',[1.75],4000);
  await phase('seek immediately after fast rate','seek',[15],2200);
  await phase('return 1x','rate',[1],2200);
  await phase('seek near EOF','seek',[26],5500);
  result.final=await page.evaluate(()=>poc.snapshot());
  await page.evaluate(()=>poc.stop());
  await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));
}finally{await browser.close();await server.close();}
