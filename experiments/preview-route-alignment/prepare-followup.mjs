// SPDX-License-Identifier: Apache-2.0
// Preserve the original video-only matrix bytes. Derive an otherwise identical
// A/V experiment module into the ignored build tree for a controlled comparison.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='build/preview-route-alignment',dash=root+'/fixtures/dash-av';await mkdir(dash,{recursive:true});
execFileSync('ffmpeg',['-nostdin','-v','error','-y','-i',root+'/fixtures/movie.mp4','-map','0:v:0','-map','0:a:0','-c','copy','-f','dash','-seg_duration','2','-adaptation_sets','id=0,streams=v id=1,streams=a',dash+'/main.mpd']);
const mpd=await readFile(dash+'/main.mpd','utf8');
await writeFile(dash+'/images.mpd',mpd.replace('</Period>','<AdaptationSet id="99" contentType="image" mimeType="image/jpeg"><Representation id="thumb" bandwidth="10000" width="160" height="90"><EssentialProperty schemeIdUri="http://dashif.org/guidelines/thumbnail_tile" value="1x1"/><SegmentTemplate timescale="1" duration="2" media="../dash/thumb$Number%02d$.jpg" startNumber="1"/></Representation></AdaptationSet></Period>'));
const source=await readFile('experiments/preview-route-alignment/experiment.js','utf8');
const pattern="isShaka?'dash/'",replacement="isShaka?'dash-av/'";assert.equal(source.split(pattern).length,2);
const derived=source.replace(pattern,replacement);await writeFile(root+'/generated/experiment-av.js',derived);
await writeFile(root+'/followup-identity.json',JSON.stringify({source:'experiments/preview-route-alignment/experiment.js',sourceSHA256:createHash('sha256').update(source).digest('hex'),transformation:{pattern,replacement},derivedSHA256:createHash('sha256').update(derived).digest('hex')},null,2)+'\n');
