// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Usage: node tests/head-to-head/verify.mjs <completed-run-directory>');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json')));
const failures=[];
for(const [name,expected]of Object.entries(manifest.sha256)) {
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep))throw Error('Unsafe manifest path');
  try{if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==expected)failures.push('Changed: '+name);}
  catch{failures.push('Missing: '+name);}
}
const summary=JSON.parse(await fs.readFile(path.join(root,'summary.json')));
if(!summary.finishedAt||summary.interrupted)failures.push('Run incomplete or interrupted');
if(summary.kind==='correctness'&&(summary.cases.length!==summary.selected.length||new Set(summary.cases.map(c=>c.id)).size!==summary.selected.length))failures.push('Matrix coverage mismatch');
for(const c of summary.cases) {
  if(!['passed','failed','blocked','skipped'].includes(c.status))failures.push('Unfinished case: '+c.id);
  if(!manifest.sha256[c.recordPath])failures.push('Unhashed case record: '+c.id);
  const record=JSON.parse(await fs.readFile(path.join(root,c.recordPath)));
  if(JSON.stringify(record)!==JSON.stringify(c))failures.push('Summary/case mismatch: '+c.id);
}
console.log(JSON.stringify({integrityPassed:!failures.length,cases:summary.cases.length,outcomes:summary.counts,failures,
  note:'Integrity pass preserves failed/blocked test outcomes; it does not turn them into successful playback.'},null,2));
process.exitCode=failures.length?1:0;
