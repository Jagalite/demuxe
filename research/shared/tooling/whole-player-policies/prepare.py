# SPDX-License-Identifier: Apache-2.0
"""Derive immutable hard-linked runtime variants; replace changed files atomically."""
import json,hashlib,os,sys
from pathlib import Path
base=Path('build/head-to-head/assets-component-isolation-01');out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
manifest=json.loads((base/'manifest.json').read_text());oldplayer=(base/'demuxe/web/native-remux-player.js').read_text();oldreader=(base/'demuxe/web/native-remux-source-worker.js').read_text()
def replace(s,a,b):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,b)
def write(p,data):
 q=p.with_name(p.name+'.new');q.write_text(data);q.replace(p)
for mode in ['baseline','range128','paused-deadline','rate-aware']:
 dst=out/mode;dst.mkdir()
 for p in base.rglob('*'):
  q=dst/p.relative_to(base)
  if p.is_dir():q.mkdir(exist_ok=True)
  elif p.is_file():os.link(p,q)
 player=replace(oldplayer,'setInterval(()=>this.pump(),50)','setInterval(()=>{this.stats.researchTicks=(this.stats.researchTicks??0)+1;this.pump();},50)');reader=oldreader
 if mode=='range128':reader=replace(reader,'bytes=await reader.read(BigInt(offset),n);','if(!file){const sequential=reader.researchEnd===offset;reader.options.blockBytes=sequential?131072:65536;}bytes=await reader.read(BigInt(offset),n);reader.researchEnd=offset+bytes.length;')
 if mode=='paused-deadline':
  player=replace(player,'this.timer=setInterval(()=>{this.stats.researchTicks=(this.stats.researchTicks??0)+1;this.pump();},50);',"this.tick=()=>{if(this.stopped)return;this.stats.researchTicks=(this.stats.researchTicks??0)+1;this.pump();this.timer=setTimeout(this.tick,this.video.paused?1000:50);};this.wake=()=>{clearTimeout(this.timer);this.tick();};this.timer=setTimeout(this.tick,50);for(const event of ['play','seeked','ratechange'])this.video.addEventListener(event,this.wake);")
  player=replace(player,'clearInterval(this.timer);this.stopWorkers();',"clearInterval(this.timer);for(const event of ['play','seeked','ratechange'])this.video.removeEventListener(event,this.wake);this.stopWorkers();")
 if mode=='rate-aware':player=replace(player,'if(!this.eof&&ahead<5&&preparedAhead<5&&bufferedBytes<12*1024*1024)','if(!this.eof&&ahead<Math.max(2,Math.min(10,5*this.video.playbackRate))&&preparedAhead<Math.max(2,Math.min(10,5*this.video.playbackRate))&&bufferedBytes<12*1024*1024)')
 for name,text in [('demuxe/web/native-remux-player.js',player),('demuxe/web/native-remux-source-worker.js',reader)]:write(dst/name,text)
 m=json.loads(json.dumps(manifest));m['research_policy']=mode;m['source_assets']=str(base)
 for name in ['demuxe/web/native-remux-player.js','demuxe/web/native-remux-source-worker.js']:
  b=(dst/name).read_bytes();m['files'][name]['sha256']=hashlib.sha256(b).hexdigest()
  for key in ['bytes','size']:
   if key in m['files'][name]:m['files'][name][key]=len(b)
 write(dst/'manifest.json',json.dumps(m,indent=2)+'\n')
h=out/'harness';h.mkdir()
for name in ['server.mjs','checks.mjs','harness.html','adapters.mjs','component-trials.mjs','run.mjs','verify.mjs','matrix.json','assets.lock.json','setup.py','expand.py','planned.json','subtitle-ocr.swift','bitmap.py']:
 t=(Path('tests/head-to-head')/name).read_text()
 if name=='adapters.mjs':
  t=replace(t,'const options={};',"const options={nativeRemux:'always'};")
  t=replace(t,'if(c.componentTrial)window.componentPlayer=player;','window.componentPlayer=player;')
 (h/name).write_text(t)
print(out)
