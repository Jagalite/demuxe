#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native full-MPD period/plan qualification; no mpv playback claim."""
import argparse,copy,datetime,hashlib,json,subprocess,threading,time,xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for n in ['native','fixtures','output']:p.add_argument('--'+n,type=Path,required=True)
p.add_argument('--adaptive-source',type=Path);p.add_argument('--session',action='store_true');p.add_argument('--aged-live',action='store_true');a=p.parse_args();a.session=a.session or a.aged_live;a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve();a.fixtures=a.fixtures.resolve();here=Path(__file__).resolve().parent
ns='{urn:mpeg:dash:schema:mpd:2011}';ET.register_namespace('',ns[1:-1]);root=ET.fromstring((a.fixtures/'dash/manifest.mpd').read_bytes());root.set('mediaPresentationDuration','PT32S');root.attrib.pop('type',None)
original=root.find(ns+'Period');root.remove(original)
for index in range(2):
 period=copy.deepcopy(original);period.set('id','period-'+str(index));period.set('start',f'PT{index*16}S');period.set('duration','PT16S')
 for template in period.iter(ns+'SegmentTemplate'):
  template.set('startNumber','1');template.set('presentationTimeOffset','0');timeline=template.find(ns+'SegmentTimeline');entries=[];at=0
  for item in timeline:
   at=int(item.get('t',at));d=int(item.attrib['d']);repeat=int(item.get('r','0'))
   for _ in range(repeat+1):entries.append((at,d));at+=d
  timeline.clear()
  for t,d in entries[:8]:ET.SubElement(timeline,ns+'S',t=str(t),d=str(d))
 root.append(period)
if a.aged_live:
 root.set('type','dynamic');root.set('availabilityStartTime',datetime.datetime.fromtimestamp(time.time()-24,datetime.timezone.utc).isoformat());root.set('timeShiftBufferDepth','PT16S');root.set('minimumUpdatePeriod','PT30S')
manifest=ET.tostring(root,encoding='utf-8',xml_declaration=True);(a.output/'manifest.mpd').write_bytes(manifest);requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*_):pass
 def do_GET(self):
  name=self.path.split('?',1)[0].lstrip('/');f=(a.fixtures/'dash'/name).resolve()
  data=manifest if name=='manifest.mpd' else f.read_bytes() if f.is_relative_to(a.fixtures/'dash') and f.is_file() else None
  status=200 if data is not None else 404;requests.append({'name':name,'status':status,'bytes':len(data or b'')})
  self.send_response(status);self.send_header('Content-Length',str(len(data or b'')));self.end_headers();self.wfile.write(data or b'')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
probe=here/('task/aged-live-probe.c' if a.aged_live else 'task/session-probe.c' if a.session else 'catalog-probe.c');task=here/'task';original=here.parent.parent/'integration/task';extra=([task/n for n in ['adaptive-session.c','component-group.c','container-task.c']]+[original/n for n in ['rewind-reader.c','random-access.c']]) if a.session else [];extra=[a.adaptive_source.resolve() if a.adaptive_source and f.name=='adaptive-session.c' else f for f in extra];cmd=['cc','-O2',f'-I{a.native}/build',f'-I{a.native}/source',f'-I{task}',f'-I{original}',str(probe),*map(str,extra)]+[str(a.native/'build'/lib/f'{lib}.a')for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
record_files=[probe,Path(__file__),*extra,*sorted(task.glob('*.h')),*sorted(original.glob('*.h')),a.native/'build-record.json',*[a.native/'build'/lib/f'{lib}.a' for lib in ['libavformat','libavcodec','libswresample','libavutil']]]
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest()for f in record_files}
for file in [probe,Path(__file__),*extra,*sorted(task.glob('*.h')),*sorted(original.glob('*.h'))]:(a.output/file.name).write_bytes(file.read_bytes())
try:
 with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
 with (a.output/'stdout.jsonl').open('w')as out,(a.output/'stderr.log').open('w')as err:r=subprocess.run([str(a.output/'probe'),f'http://127.0.0.1:{server.server_port}/manifest.mpd'],stdout=out,stderr=err,timeout=30)
 result={'scope':'Synthetic aged MPD startup and seek admission; not rendered A/V' if a.aged_live else 'Native continuous packet execution across two periods; paced consumption; not rendered A/V' if a.session else __doc__,'exit':r.returncode,'passed':r.returncode==0,'inputs':inputs,'manifestSHA256':hashlib.sha256(manifest).hexdigest(),'requests':requests,'compile':cmd}
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(r.returncode)
finally:server.shutdown();server.server_close();thread.join()
