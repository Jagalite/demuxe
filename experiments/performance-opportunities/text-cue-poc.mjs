// SPDX-License-Identifier: Apache-2.0
// Host FFmpeg extracts text for a bounded parser/scheduler proof. No browser route changes.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const sources={
  srt:'build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',
  mov_text:'build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4',
};
const parseTime=value=>{const m=/^(\d+):(\d\d):(\d\d),(\d\d\d)$/.exec(value);assert.ok(m,value);return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;};
function parseSrt(raw){return raw.trim().split(/\r?\n\s*\r?\n/).map(block=>{
  const lines=block.split(/\r?\n/),timing=lines[1]?.match(/^(\S+) --> (\S+)$/);assert.ok(timing,block);
  return {start:parseTime(timing[1]),end:parseTime(timing[2]),text:lines.slice(2).join('\n')};
});}
function active(cues,time){return cues.filter(c=>c.start<=time&&time<c.end).map(c=>c.text).join('\n');}
for(const [format,file] of Object.entries(sources)){
  const raw=execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:s:0','-f','srt','-'],{encoding:'utf8'});
  const cues=parseSrt(raw),checks=[[0.25,''],[0.75,'DE MUXE TEST 123'],[6,'DE MUXE TEST 123'],[10,'DE MUXE TEST 123'],[1,'DE MUXE TEST 123'],[35.9,'']];
  for(const [time,expected] of checks)assert.equal(active(cues,time),expected,format+' at '+time);
  let polls=0,changes=0,last='';for(let frame=0;frame<36*30;frame++){
    const value=active(cues,frame/30);polls++;if(value!==last){changes++;last=value;}
  }
  console.log(JSON.stringify({format,cues,checks:checks.length,simulatedFramePolls:polls,requiredCueTransitions:changes}));
}
