#!/usr/bin/env python3
"""Native DASH subtitle packet proof across two periods; no A/V rendering claim."""
import argparse,hashlib,json,subprocess,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for n in ['native','fixtures','output']:p.add_argument('--'+n,type=Path,required=True)
a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve();a.fixtures=a.fixtures.resolve();here=Path(__file__).resolve().parent;task=here/'task';original=here.parent.parent/'integration/task'
requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*_):pass
 def do_GET(self):
  name=self.path.split('?',1)[0].lstrip('/');file=(a.fixtures/name).resolve()
  data=file.read_bytes() if file.is_relative_to(a.fixtures) and file.is_file() else None
  status=200 if data is not None else 404;requests.append({'name':name,'status':status,'bytes':len(data or b'')})
  self.send_response(status);self.send_header('Content-Length',str(len(data or b'')));self.end_headers();self.wfile.write(data or b'')
files=[task/n for n in ['session-probe.c','adaptive-session.c','component-group.c','container-task.c','webvtt-map.c']]+[original/n for n in ['rewind-reader.c','random-access.c']]
cmd=['cc','-O2','-g',f'-I{task}',f'-I{original}',f'-I{a.native}/build',f'-I{a.native}/source',*map(str,files)]+[str(a.native/'build'/lib/f'{lib}.a')for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest()for f in [*files,Path(__file__),*sorted(task.glob('*.h')),*sorted(original.glob('*.h')),a.native/'build-record.json',*[a.native/'build'/lib/f'{lib}.a' for lib in ['libavformat','libavcodec','libswresample','libavutil']]]}
for f in [*files,Path(__file__),*sorted(task.glob('*.h')),*sorted(original.glob('*.h'))]:(a.output/f.name).write_bytes(f.read_bytes())
with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with (a.output/'stdout.jsonl').open('w')as out,(a.output/'stderr.log').open('w')as err:r=subprocess.run([str(a.output/'probe'),f'http://127.0.0.1:{server.server_port}/manifest.mpd'],stdout=out,stderr=err,timeout=35)
 result={'scope':__doc__,'inputs':inputs,'compile':cmd,'exit':r.returncode,'requests':requests,'passed':r.returncode==0 and all(v['status']==200 for v in requests)}
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'exit':r.returncode}));raise SystemExit(0 if result['passed']else 1)
finally:server.shutdown();server.server_close();thread.join()
