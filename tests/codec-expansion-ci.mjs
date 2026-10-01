// SPDX-License-Identifier: Apache-2.0
// CI-only browser orchestration. Local browser execution uses the T3 preview.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,lstat,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mediaReferenceEnvironment} from '../scripts/media-reference-environment.mjs';
import path from 'node:path';
import {sha,caseKey,checkResults,checkCoverage,verifyInventory,compositionEncodings,integerCodecs,families} from '../scripts/codec-expansion-ci.mjs';
assert.equal(process.env.CI,'true','This runner is for CI; use the collaborative preview locally');
const family=process.env.BROWSER;assert.ok(['chromium','firefox'].includes(family),'Explicit BROWSER required');
const input=JSON.parse(await readFile('build/codec-expansion/ci-input.json'));
const directory=path.resolve(process.env.CODEC_EXPANSION_INPUTS??'build/codec-expansion-ci-inputs');
assert.equal(process.env.CODEC_EXPANSION_INVENTORY_SHA256,input.inventorySHA256);
await verifyInventory(directory,input.inventorySHA256);
const installed=JSON.parse(await readFile('build/codec-expansion/installed.json')),cases=JSON.parse(await readFile(installed.work+'/cases.json'));
checkCoverage(cases);
if(input.inventory.supplemental){const expected=JSON.parse(await readFile(input.inventory.supplemental.manifest));assert.deepEqual(installed.supplemental,expected,'Supplemental deployment changed');for(const fixture of expected.filter(f=>f.generated!==false))for(const delivery of ['assets','embedded'])for(const encoding of compositionEncodings(fixture))assert.ok(cases.some(c=>c.fixture.id===fixture.id&&c.delivery===delivery&&c.encoding===encoding),'Missing supplemental fixture/delivery: '+fixture.id+'/'+delivery);}
if(input.inventory.packetFixtures){const expected=JSON.parse(await readFile(input.inventory.packetFixtures.manifest));assert.deepEqual(installed.packetFixtures,expected,'Packet fixture deployment changed');for(const fixture of expected)for(const delivery of ['assets','embedded'])assert.ok(cases.some(c=>c.fixture.id===fixture.id&&c.delivery===delivery&&c.type==='packet'),'Missing packet fixture/delivery: '+fixture.id+'/'+delivery);}
const hashes=async()=>{const files={};for(const [name,record]of Object.entries(input.inventory.files)){assert.equal(sha(await readFile(name)),record.sha256,'Input changed: '+name);files[name]=record.sha256;}const walk=async(folder)=>{for(const entry of await readdir(folder,{withFileTypes:true})){const name=folder+'/'+entry.name;assert.ok(!(await lstat(name)).isSymbolicLink());if(entry.isDirectory())await walk(name);else files[path.relative(installed.work,name)]=sha(await readFile(name));}};await walk(installed.work+'/bundles');files['cases.json']=sha(await readFile(installed.work+'/cases.json'));return files;};
const before=await hashes(),rejections=new Set();
for(const item of cases.filter(c=>c.type==='composition'&&c.encoding==='flac'&&!c.fixture.expectedRejection)){
 const f=item.fixture,integer=integerCodecs.has(f.codec),doubles=f.codec==='pcm-f64le';if(!integer&&!f.codec.startsWith('pcm-f'))continue;
 const bytes=await readFile(path.join(f.fixtureRoot??'build/codec-expansion/decoder-fixtures',f.id+(integer?'.s32':doubles?'.f64':'.f32')));
 for(let i=0;i<bytes.length;i+=doubles?8:4){const loss=integer?(bytes.readInt32LE(i)&255)!==0:!Number.isInteger((doubles?bytes.readDoubleLE(i):bytes.readFloatLE(i))*8388608);if(loss){rejections.add(caseKey(item));break;}}
}
const logs=[],server=spawn(process.execPath,['tests/codec-expansion-browser.mjs'],{env:{...process.env,PORT:'4187'},stdio:['ignore','pipe','pipe']});
let browser;const out='build/codec-expansion/ci-'+family;await mkdir(out,{recursive:true});const report={schema:1,passed:false,family,executionMode:'headless-functional',qualificationScope:'Exact installed packet/composition matrix; no release or performance promotion',inventorySHA256:input.inventorySHA256,inputSHA256:before,expectedCases:cases.map(caseKey),expectedPrecisionRejections:[...rejections],packages:input.inventory.packages};
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),30000);server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});server.stdout.on('data',data=>{logs.push(String(data));if(String(data).includes('Codec expansion tests')){clearTimeout(timer);resolve();}});server.stderr.on('data',data=>logs.push(String(data)));});
 report.referenceEnvironment=await mediaReferenceEnvironment();
 const {chromium,firefox}=await import('playwright');browser=await(family==='firefox'?firefox.launch({headless:true,firefoxUserPrefs:{'media.autoplay.default':0}}):chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']}));report.browserVersion=browser.version();
 const page=await browser.newPage(),errors=[],requests=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));page.on('pageerror',error=>errors.push(String(error)));await page.goto('http://127.0.0.1:4187');await page.locator('#run').click();await page.waitForFunction(()=>globalThis.testResult!==undefined,{},{timeout:600000});
 const result=await page.evaluate(()=>globalThis.testResult);report.result=result;checkResults(result,cases,rejections);assert.deepEqual(errors,[],'Unhandled browser error');
 for(const name of requests.filter(name=>name.endsWith('.wasm'))){const match=name.match(/^\/bundles\/([a-z0-9-]+)-assets\/assets\/web\/providers\/audio\/([^/]+)\/module\.wasm$/);assert.ok(match&&families.includes(match[1])&&[match[1],'flac','opus-encoder'].includes(match[2]),'Unselected or embedded external Wasm request: '+name);}report.requests=requests;assert.equal(requests.filter(name=>name.endsWith('.wasm')).length>0,true,'No assets Wasm requests observed');
 // A real negative audio gate: muted post-seek playback must fail in each browser.
 await page.goto('http://127.0.0.1:4187/?postSeekSilence');await page.locator('#run').click();await page.waitForFunction(()=>globalThis.testResult!==undefined,{},{timeout:120000});const silence=await page.evaluate(()=>globalThis.testResult);assert.equal(silence.passed,false);assert.match(silence.error,/silent post-seek playback/);report.silenceControl={passed:true,error:silence.error};
 assert.deepEqual(await hashes(),before,'Inputs or installed bundles changed while testing');report.result=result;report.passed=true;
}catch(error){report.error=String(error.stack);throw error;}finally{
 if(browser)await browser.close().catch(error=>{report.cleanupError=String(error);report.passed=false;});server.kill('SIGTERM');if(server.exitCode===null)await once(server,'exit');report.serverLog=logs;await writeFile(out+'/qualification.json',JSON.stringify(report,null,2)+'\n');console.log('Evidence: '+out+'/qualification.json');
}
assert.equal(report.passed,true);
