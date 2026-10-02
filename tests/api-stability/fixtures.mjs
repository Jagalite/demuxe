// SPDX-License-Identifier: Apache-2.0
// Portable CI fixtures: no personal media library or prior research run required.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('fixtures',{recursive:true});await mkdir('build/fixtures',{recursive:true});
const commands=[];
function ff(args){commands.push(args);execFileSync('ffmpeg',['-nostdin','-v','error','-y',...args],{stdio:'inherit'});}
ff(['-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','30','-c:a','aac','-ac','2','-movflags','+faststart','fixtures/example.mp4']);
await writeFile('build/fixtures/captions.srt','1\n00:00:00,000 --> 00:00:12,000\nCI caption\n');
ff(['-i','fixtures/example.mp4','-i','build/fixtures/captions.srt','-map','0:v','-map','0:a','-map','0:a','-map','1:0','-c','copy','-metadata:s:a:0','language=eng','-metadata:s:a:1','language=fra','build/fixtures/tracks.mkv']);
const hashes={};for(const file of ['fixtures/example.mp4','build/fixtures/tracks.mkv'])hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('build/fixtures/api-fixtures.json',JSON.stringify({commands,hashes},null,2)+'\n');
