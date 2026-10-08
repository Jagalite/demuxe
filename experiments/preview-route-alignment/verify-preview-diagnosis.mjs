// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const [directory,mode]=process.argv.slice(2),run=JSON.parse(await readFile(directory+'/run.json','utf8')),r=run.results[0];
assert.deepEqual(r.pageErrors,[]);assert.deepEqual(r.errors,[]);assert.equal(r.playbackStatus,'pass');
const trace=r.trace,starts=trace.filter(e=>e.kind==='seek-start'),paused=starts.at(-1),end=trace.find(e=>e.id===paused.id&&['seek-done','seek-error'].includes(e.kind)&&e.at>=paused.at);
assert.ok(paused&&end);const summary={browser:run.browser,version:run.version,mode,combinedStatus:r.status,preview:r.preview,pausedPreview:r.pausedPreview,lastChildSeekMs:end.at-paused.at,seekOutcome:end,diagnostics:r.previewDiagnostics};
if(mode==='before'){
 assert.equal(r.pausedPreview.name,'AbortError');
 const timeout=trace.find(e=>e.kind==='settle'&&e.caller&&e.stack?.includes('expire@'));
 assert.ok(timeout);assert.ok(timeout.at>=timeout.caller.deadline);summary.timeoutOvershootMs=timeout.at-timeout.caller.deadline;
 const stalled=trace.filter(e=>e.kind==='native-sample'&&e.id===paused.id).at(-1),remux=stalled.diagnostics.remux;
 assert.ok(remux.ranges.at(-1)[1]<10);assert.ok(remux.stats.bufferedBytesUpperBound>=8*1024*1024);assert.deepEqual(remux.stats.errors,[]);assert.equal(remux.delivery.busy,false);assert.equal(remux.delivery.pulling,false);
 summary.stalledCoverage=remux.ranges;summary.stalledBytes=remux.stats.bufferedBytesUpperBound;
}else if(mode==='fixed'){
 assert.equal(r.pausedPreview,null);assert.equal(end.kind,'seek-error');assert.match(end.message,/cannot prepare the target.*coded-data budget/);assert.ok(end.at-paused.at<15000);assert.ok(r.previewDiagnostics.failures>=1);
 assert.ok(!trace.some(e=>e.kind==='settle'&&e.caller&&e.stack?.includes('expire@')));
}else if(mode==='expanded'){
 assert.equal(r.pausedPreview.path,'native-remux');assert.ok(Math.abs(r.pausedPreview.time-10)<.25);assert.equal(r.pausedPreview.width,160);assert.equal(r.pausedPreview.height,90);assert.equal(end.kind,'seek-done');
 summary.verifiedImages=[];for(const frame of [r.preview,r.pausedPreview])if(frame?.image){const rgb=[...execFileSync('ffmpeg',['-v','error','-i',directory+'/'+frame.image,'-vf','crop=16:16:8:8,scale=1:1','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'])];assert.equal(rgb.length,3);assert.ok(rgb[1]>170&&rgb[0]<70&&rgb[2]<70);summary.verifiedImages.push({image:frame.image,rgb});}
}else throw Error('Expected before, fixed or expanded');
await writeFile(directory+'/diagnosis-verified.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
