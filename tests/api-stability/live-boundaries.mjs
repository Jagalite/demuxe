// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';
import {installLiveRuntime} from './live-runtime.mjs';
import {chromium,firefox,webkit,testBrowserRuntime} from '../browser-test-runtime.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {liveBoundaryCases,checkLiveBoundary} from './live-boundary-scenarios.mjs';
import {liveNetworkCases,checkLiveNetwork} from './live-network-scenarios.mjs';
import {startLiveFaultServer} from './live-fault-server.mjs';
import {deadline,collectFailureDiagnostics,liveEvidenceInputs} from './live-check-helpers.mjs';
if(process.argv.includes('--archive')&&!process.env.BETA_ARCHIVE)throw Error('Release boundary checks require BETA_ARCHIVE');
const allCases=[...liveBoundaryCases,...liveNetworkCases];
if(process.env.DEMUXE_RUNTIME_ROOT&&!process.env.BETA_ARCHIVE)throw Error('Packaged boundary checks require BETA_ARCHIVE for an independent offline installation');
const family=process.env.BROWSER??'chromium',type={chromium,firefox,webkit}[family];
if(!type)throw Error('BROWSER must be chromium, firefox or webkit');
const output=`results/api-stability/live-boundaries/${family}-${Date.now()}`;await mkdir(output,{recursive:true});
const negativeControl=process.env.LIVE_NEGATIVE_CONTROL==='retain-preview-source';
if(process.env.LIVE_NEGATIVE_CONTROL&&!negativeControl)throw Error('Unknown negative control');
let installed,server;
const report={family,testBrowserRuntime,negativeControl,passed:false,scope:'Source-runtime live boundary checks; not installed-package or release qualification',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:[],hashes:{}};
let browser,faultServer;
const save=()=>writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');

try{
 installed=process.env.BETA_ARCHIVE?await installLiveRuntime(process.env.BETA_ARCHIVE):null;
 if(installed)Object.assign(report,{scope:'Installed-archive live boundary checks',archiveSHA256:installed.archiveSHA256,sourceCommit:installed.manifest.sourceCommit,runtimeFiles:installed.manifest.files});
 for(const file of liveEvidenceInputs)report.hashes[file]=createHash('sha256').update(await readFile(installed&&file.startsWith('web/')?path.join(installed.runtimeRoot,file):file)).digest('hex');
 server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0',...(installed?{DEMUXE_RUNTIME_ROOT:installed.runtimeRoot}:{})},stdio:['ignore','pipe','inherit']});
 report.origin=await deadline(new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));server.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match)resolve(match[0]);});}),10000);
 faultServer=await startLiveFaultServer(report.origin);report.assetOrigin=report.origin;report.origin=faultServer.origin;
 report.servedHashes={};
 for(const [file,hash]of Object.entries(report.hashes)){if(!file.startsWith('web/'))continue;const response=await fetch(report.origin+'/'+file,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Missing runtime asset '+file);const served=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(served!==hash)throw Error('Served runtime differs: '+file);report.servedHashes[file]=served;}
 browser=await type.launch({headless:true,...family==='chromium'?{args:['--autoplay-policy=no-user-gesture-required']}:family==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0}}:{}});report.browser=browser.version();
 for(const scenario of negativeControl?['preview-success']:allCases){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('crash',()=>errors.push('Page crashed'));
  const row={scenario,passed:false,errors};report.checks.push(row);
  try{
   await page.goto(report.origin+'/__live_boundaries__');await page.locator('button').click();
   row.evidence=await deadline(page.evaluate(scenario.startsWith('network-')?checkLiveNetwork:checkLiveBoundary,{scenario,negativeControl,faultOrigin:faultServer.origin}),30000);
   if(errors.length)throw Error('Unexpected page errors');
   if(row.evidence.trace.find(event=>event.kind==='fixture')?.sha256!==report.hashes['fixtures/example.mp4'])throw Error('Browser fixture identity differs');row.passed=true;
  }catch(error){row.error=String(error.stack);Object.assign(row,await collectFailureDiagnostics(page,`${output}/${scenario}.png`));process.exitCode=1;}
  finally{try{await deadline(context.close(),10000);}catch(error){row.passed=false;row.cleanupError=String(error);process.exitCode=1;}await save();}
  console.log(family,scenario,row.passed?'PASS':'FAIL',row.error??'');
 }
 report.passed=report.checks.length===allCases.length&&report.checks.every(row=>row.passed);
}catch(error){report.error=String(error.stack);process.exitCode=1;}
finally{try{if(browser)await deadline(browser.close(),10000);}catch(error){report.passed=false;report.cleanupError=String(error);process.exitCode=1;}finally{server?.kill();await faultServer?.close();await save();await installed?.cleanup();console.log('Live boundary report:',output);}}
