// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=path.dirname(import.meta.filename),profile=await fs.mkdtemp(path.join(os.tmpdir(),'demuxe-firefox-resume-'));
await fs.writeFile(path.join(profile,'user.js'),'user_pref("media.autoplay.default",0);\nuser_pref("browser.shell.checkDefaultBrowser",false);\nuser_pref("browser.startup.homepage_override.mstone","ignore");\n');
const proc=spawn('/Applications/Firefox.app/Contents/MacOS/firefox',['--headless','--no-remote','--profile',profile,'--remote-debugging-port','4199'],{stdio:['ignore','pipe','pipe']});
let log='';proc.stdout.on('data',b=>log+=b);proc.stderr.on('data',b=>log+=b);
const runId=process.env.RUN_ID??'system-firefox';
await fs.writeFile(path.join(out,runId+'-harness.mjs'),await fs.readFile(import.meta.filename));
const report={started:new Date().toISOString(),profile,connection:'Isolated installed Firefox WebDriver BiDi',cases:[]};let ws,id=0;const pending=new Map();
const call=(method,params)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
try{
 for(let n=0;n<100&&!log.includes('WebDriver BiDi listening');n++)await new Promise(r=>setTimeout(r,100));
 ws=new WebSocket('ws://127.0.0.1:4199/session');await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=e=>{const value=JSON.parse(e.data);if(!value.id)return;const p=pending.get(value.id);if(!p)return;pending.delete(value.id);value.type==='error'?p.reject(Error(JSON.stringify(value))):p.resolve(value.result);};
 report.session=await call('session.new',{capabilities:{alwaysMatch:{acceptInsecureCerts:false}}});
 const {context}=await call('browsingContext.create',{type:'tab'});
 for(const kind of (process.argv.slice(2).length?process.argv.slice(2):['plain-cold-control1','plain-cold-control2','plain-cold-control3','demuxe-cold-control1','demuxe-cold-control2','demuxe-cold-control3'])){
  await call('browsingContext.navigate',{context,url:'http://127.0.0.1:4198/',wait:'complete'});
  if(kind.includes('copy')){const data=await fs.readFile(path.join(out,'remux-copy.mp4'));await call('script.evaluate',{expression:'window.fixtureProbeURL='+JSON.stringify('data:video/mp4;base64,'+data.toString('base64')),target:{context},awaitPromise:false,resultOwnership:'none'});}
  const value=await call('script.evaluate',{expression:'runResumeProbe('+JSON.stringify(kind)+').then(JSON.stringify)',target:{context},awaitPromise:true,resultOwnership:'none'});
  const raw=value.result;report.cases.push({kind,result:raw?.type==='string'?JSON.parse(raw.value):value});
  await fs.writeFile(path.join(out,runId+'.json'),JSON.stringify(report,null,2));console.log(kind,report.cases.at(-1).result.failure??'PASS');
 }
 await call('session.end',{});
}catch(e){report.failure=String(e.stack);console.log(report.failure);}finally{ws?.close();proc.kill();report.log=log;report.finished=new Date().toISOString();await fs.writeFile(path.join(out,runId+'.json'),JSON.stringify(report,null,2));}
