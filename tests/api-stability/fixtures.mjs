// SPDX-License-Identifier: Apache-2.0
// Portable CI fixtures: no personal media library or prior research run required.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {assertFilterReferencePixels} from './filter-reference.mjs';
await mkdir('fixtures',{recursive:true});await mkdir('build/fixtures',{recursive:true});
const commands=[];
function ff(args){commands.push(args);execFileSync('ffmpeg',['-nostdin','-v','error','-y',...args],{stdio:'inherit'});}
ff(['-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','30','-c:a','aac','-ac','2','-movflags','+faststart','fixtures/example.mp4']);
await writeFile('build/fixtures/captions.srt','1\n00:00:00,000 --> 00:00:12,000\nCI caption\n');
ff(['-i','fixtures/example.mp4','-i','build/fixtures/captions.srt','-map','0:v','-map','0:a','-map','0:a','-map','1:0','-c','copy','-metadata:s:a:0','language=eng','-metadata:s:a:1','language=fra','build/fixtures/tracks.mkv']);
// Geometry assertions must not compare different animation frames across routes.
// Keep the animated example for seek/sequence tests; this reference is static.
const reference='fixtures/filter-reference.mp4';
ff(['-f','lavfi','-i','color=c=red:s=640x360:r=30,drawbox=x=320:y=0:w=320:h=180:c=lime:t=fill,drawbox=x=0:y=180:w=320:h=180:c=blue:t=fill,drawbox=x=320:y=180:w=320:h=180:c=yellow:t=fill,drawbox=x=40:y=30:w=80:h=110:c=black:t=fill,drawbox=x=440:y=240:w=130:h=60:c=white:t=fill','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-qp','18','-pix_fmt','yuv420p','-g','1','-c:a','aac','-ac','2','-movflags','+faststart',reference]);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',reference],{encoding:'utf8'}));
const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
assert.equal(video?.width,640);assert.equal(video?.height,360);assert.equal(video?.r_frame_rate,'30/1');assert.ok(Number(video?.duration)>=12);assert.equal(audio?.codec_name,'aac');
const frameHashes=execFileSync('ffmpeg',['-v','error','-i',reference,'-map','0:v:0','-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim());
assert.equal(frameHashes.length,360);assert.equal(new Set(frameHashes).size,1,'Filter reference must have identical decoded frames');
const rgb=execFileSync('ffmpeg',['-v','error','-i',reference,'-frames:v','1','-vf','scale=64:36','-pix_fmt','rgb24','-f','rawvideo','-']);
const filterReference={frames:frameHashes.length,decodedFrameMD5:frameHashes[0],unappliedFilterErrors:assertFilterReferencePixels(rgb)};
const hashes={};for(const file of ['fixtures/example.mp4','build/fixtures/tracks.mkv',reference])hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('build/fixtures/api-fixtures.json',JSON.stringify({commands,hashes,filterReference},null,2)+'\n');
