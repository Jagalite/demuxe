// SPDX-License-Identifier: Apache-2.0
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const directory=process.argv[2],expected=Number(process.argv[3]??39),expectedLifecycle=Number(process.argv[4]??8),expectedFailures=(process.argv[5]??'').split(',').filter(Boolean);
const host=JSON.parse(await readFile(directory+'/host.json','utf8')),records=[];
for(const file of await readdir(directory)){if(!file.endsWith('.json'))continue;const r=JSON.parse(await readFile(directory+'/'+file,'utf8'));if(r.config)records.push(r);}
const unavailable=records.filter(r=>r.config.runtime==='jspi'&&host.jspi!=='function');
for(const r of unavailable){assert.equal(r.status,'fail');assert.equal(r.error?.code,'UNSUPPORTED_FEATURE');assert.match(r.error?.message,/Requested JSPI runtime is unavailable/);assert.equal(r.frames.length,0);assert.equal(r.checks.noIframeLeaks,true);}
const lifecycle=records.filter(r=>r.kind==='lifecycle');assert.equal(lifecycle.length,expectedLifecycle);
for(const r of lifecycle){assert.equal(r.status,'pass',r.config.id+': '+r.failure);assert.ok(Object.keys(r.checks).length>=15);for(const [name,value]of Object.entries(r.checks))assert.equal(value,true,r.config.id+': '+name);}
const capability=records.find(r=>r.kind==='capability');assert.ok(capability);
if(host.jspi!=='function'){assert.equal(capability.status,'pass');assert.equal(capability.errors.length,3);for(const value of Object.values(capability.checks))assert.equal(value,true);}else assert.equal(capability.status,'not-applicable');
const maintained=JSON.parse(await readFile(directory+'/maintained-browser.json','utf8'));for(const name of ['native','software'])assert.equal(maintained[name].status,'pass',JSON.stringify(maintained[name]));
const verified=spawnSync(process.execPath,['experiments/preview-route-alignment/verify.mjs',directory,String(expected),[...unavailable.map(r=>r.config.id),...expectedFailures].join(',')],{encoding:'utf8'});process.stdout.write(verified.stdout);process.stderr.write(verified.stderr);assert.equal(verified.status,0);
const summary={host,thumbnailAndPolicyCases:expected,supportedPassed:expected-unavailable.length-expectedFailures.length,knownFailures:expectedFailures,unavailableJspi:unavailable.length,lifecyclePassed:lifecycle.length,capabilityRejection:capability.status,maintainedPassed:2};
await writeFile(directory+'/crossbrowser-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
