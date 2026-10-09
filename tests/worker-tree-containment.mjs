// SPDX-License-Identifier: Apache-2.0
import {chromium,firefox,webkit} from 'playwright';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
const family=process.env.BROWSER||'firefox',out='results/worker-tree-containment/'+family;await mkdir(out,{recursive:true});
const counts=new Map(),report={family,checks:[],passed:false},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
const server=createServer((req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');if(req.url.startsWith('/heartbeat?')){const key=new URL(req.url,'http://localhost').searchParams.get('key');counts.set(key,(counts.get(key)||0)+1);res.end('ok');}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Worker subtree lifetime</title>');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;let browser;
try{browser=await ({chromium,firefox,webkit}[family]).launch({headless:true});report.browser=browser.version();const page=await browser.newPage();await page.goto(origin);
for(let cycle=0;cycle<10;cycle++){
 const row={cycle,passed:false};report.checks.push(row);await save();
 await page.evaluate(({origin,cycle})=>{const script=level=>`setInterval(()=>fetch(${JSON.stringify(origin+'/heartbeat?key='+cycle+'-')}+${level}),20);`+(level<2?`const childURL=URL.createObjectURL(new Blob([${JSON.stringify(level===0?script(1):script(2))}],{type:'text/javascript'}));new Worker(childURL);`:'');const url=URL.createObjectURL(new Blob([script(0)],{type:'text/javascript'}));window.treeWorker=new Worker(url);URL.revokeObjectURL(url);},{origin,cycle});
 let deadline=Date.now()+10000;while([0,1,2].some(level=>(counts.get(cycle+'-'+level)||0)<5)){if(Date.now()>deadline)throw Error('Nested worker heartbeat failed to start');await wait(20);}
 const sample=()=>[0,1,2].map(level=>counts.get(cycle+'-'+level)||0);row.before=sample();await wait(200);row.control=sample();if(row.control.some((value,i)=>value<=row.before[i]))throw Error('Negative control did not observe every live descendant');
 await page.evaluate(()=>{treeWorker.terminate();window.treeWorker=null;});await wait(500);row.settled=sample();await wait(500);row.after=sample();if(row.after.some((value,i)=>value!==row.settled[i]))throw Error('Root termination left a live descendant');row.passed=true;await save();console.log('PASS direct worker three-level containment',family,cycle);
}report.passed=true;
}catch(error){report.error=String(error.stack);process.exitCode=1;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await save();}
