// SPDX-License-Identifier: Apache-2.0
// Separate container/codec capability hints for the retained Hybrid audio rows.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const [runArg,outArg]=process.argv.slice(2);
assert.ok(runArg&&outArg,'Usage: node tests/head-to-head/probe-hybrid-mse.mjs <run> <fresh-output>');
const run=path.resolve(runArg),out=path.resolve(outArg),bytes=await fs.readFile(path.join(run,'summary.json'));
const summary=JSON.parse(bytes),ids=['h264-ac3','h264-eac3','h264-dts','hevc10-ac3','hevc10-eac3','hevc10-dts','hdr10-hevc'];
const sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(out,{recursive:false});await fs.mkdir(path.join(out,'files'));
await fs.copyFile(import.meta.filename,path.join(out,'files/probe-hybrid-mse.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const result={kind:'capability-hints',sourceRun:run,summarySHA256:sha(bytes),browser:browser.version(),command:process.argv,cases:[],limitations:['API hints only, not decoded-output or full playback qualification.','DTS is not assigned a hypothetical supported packaging contract.']};
try {
 assert.equal(summary.browserIdentity,`chromium/${browser.version()}/chrome/headless`);
 const page=await browser.newPage();
 for(const fixture of ids){
  const c=summary.cases.find(c=>c.fixture===fixture&&c.player==='demuxe');assert.ok(c);
  const d=(c.initial??c.failureState).diagnostics;
  const hint=d.runtimeCapabilities.find(x=>x.planId==='native-remux')?.evidence?.apiHint;
  const match=hint?.match(/MediaSource.isTypeSupported\((.+)\)=false/);
  const combined=match?.[1];
  const video=d.backend.decoderStats.codec;
  const audio=combined?.match(/codecs="[^,]+,([^"]+)"/)?.[1];
  const types={video:`video/mp4; codecs="${video}"`,...(audio?{audio:`audio/mp4; codecs="${audio}"`,combined}:{})};
  const probes=await page.evaluate(types=>Object.fromEntries(Object.entries(types).map(([key,type])=>[key,{type,mse:MediaSource.isTypeSupported(type),mediaElement:document.createElement('video').canPlayType(type)}])),types);
  result.cases.push({id:c.id,record:path.relative(out,path.join(run,c.recordPath)),recordSHA256:sha(await fs.readFile(path.join(run,c.recordPath))),recordedCombinedHint:hint??null,probes});
 }
} finally {await browser.close();}
await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({sha256:{'result.json':sha(await fs.readFile(path.join(out,'result.json'))),'files/probe-hybrid-mse.mjs':sha(await fs.readFile(import.meta.filename))}},null,2)+'\n');
console.log(JSON.stringify(result.cases.map(c=>({id:c.id,probes:c.probes})),null,2));
