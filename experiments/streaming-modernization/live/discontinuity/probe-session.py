#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native HLS discontinuity packet proof with repeated timestamp epochs; no A/V rendering claim."""
import argparse,hashlib,json,subprocess,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for n in ['native','fixtures','output']:p.add_argument('--'+n,type=Path,required=True)
p.add_argument('--task',type=Path);a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve();a.fixtures=a.fixtures.resolve();here=Path(__file__).resolve().parent;task=a.task.resolve() if a.task else here/'task';original=here.parent.parent/'integration/task'
media={};media['master.m3u8']=(a.fixtures/'master.m3u8').read_bytes()
for name in ['low','medium','high','english','alternate']:
 lines=(a.fixtures/name/'media.m3u8').read_text().splitlines();parts=[]
 for i,line in enumerate(lines):
  if line.startswith('#EXTINF:'):parts.append((float(line.split(':')[1].rstrip(',')),lines[i+1]))
 parts=parts[:8];assert len(parts)==8
 parts[-1]=(16-sum(d for d,_ in parts[:-1]),parts[-1][1]);assert parts[-1][0]>0
 playlist=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-TARGETDURATION:3','#EXT-X-MEDIA-SEQUENCE:0','#EXT-X-DISCONTINUITY-SEQUENCE:0']
 for epoch in range(2):
  if epoch:playlist.append('#EXT-X-DISCONTINUITY')
  playlist.append(f'#EXT-X-MAP:URI="../epoch{epoch}/{name}/init.mp4"')
  for duration,file in parts:playlist += [f'#EXTINF:{duration:.6f},',f'../epoch{epoch}/{name}/{file}']
 playlist.append('#EXT-X-ENDLIST');media[name+'/media.m3u8']=('\n'.join(playlist)+'\n').encode()
playlist=['#EXTM3U','#EXT-X-TARGETDURATION:2','#EXT-X-DISCONTINUITY-SEQUENCE:0']
for epoch in range(2):
 if epoch:playlist.append('#EXT-X-DISCONTINUITY')
 for index in range(8):
  name=f'epoch{epoch}/cue-{index}.vtt';playlist += ['#EXTINF:2,',name]
  media[name]=(f'WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:02.000,MPEGTS:0\n\n{epoch}-{index}\n00:00:{index*2+2.25:06.3f} --> 00:00:{index*2+3.75:06.3f}\nEpoch {epoch} cue {index}\n').encode()
playlist.append('#EXT-X-ENDLIST');media['captions.m3u8']=('\n'.join(playlist)+'\n').encode()
for name,data in media.items():f=a.output/'fixture'/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)
requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*_):pass
 def do_GET(self):
  name=self.path.split('?',1)[0].lstrip('/');data=media.get(name)
  if data is None:
   parts=name.split('/',1);file=(a.fixtures/parts[-1]).resolve()
   if parts[0] in ['epoch0','epoch1'] and file.is_relative_to(a.fixtures) and file.is_file():data=file.read_bytes()
  status=200 if data is not None else 404;requests.append({'name':name,'status':status,'bytes':len(data or b'')})
  self.send_response(status);self.send_header('Content-Length',str(len(data or b'')));self.end_headers();self.wfile.write(data or b'')
files=[here/'task/session-probe.c']+[task/n for n in ['adaptive-session.c','component-group.c','container-task.c','webvtt-map.c']]+[original/n for n in ['rewind-reader.c','random-access.c']]
cmd=['cc','-O2','-g',f'-I{task}',f'-I{original}',f'-I{a.native}/build',f'-I{a.native}/source',*map(str,files)]+[str(a.native/'build'/lib/f'{lib}.a')for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest()for f in [*files,Path(__file__),*sorted(task.glob('*.h')),*sorted(original.glob('*.h')),a.native/'build-record.json',*[a.native/'build'/lib/f'{lib}.a' for lib in ['libavformat','libavcodec','libswresample','libavutil']]]}
for f in [*files,Path(__file__),*sorted(task.glob('*.h')),*sorted(original.glob('*.h'))]:(a.output/f.name).write_bytes(f.read_bytes())
with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with (a.output/'stdout.jsonl').open('w')as out,(a.output/'stderr.log').open('w')as err:r=subprocess.run([str(a.output/'probe'),f'http://127.0.0.1:{server.server_port}/master.m3u8'],stdout=out,stderr=err,timeout=35)
 result={'scope':__doc__,'inputs':inputs,'compile':cmd,'exit':r.returncode,'requests':requests,'passed':r.returncode==0 and all(v['status']==200 for v in requests)}
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'exit':r.returncode}));raise SystemExit(0 if result['passed']else 1)
finally:server.shutdown();server.server_close();thread.join()
