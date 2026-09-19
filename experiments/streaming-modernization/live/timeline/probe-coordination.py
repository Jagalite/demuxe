#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native delayed-audio interleaving and truthful-length corrupted-container admission."""
import argparse,hashlib,importlib.util,json,subprocess,threading,time
from http.server import ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--native',type=Path,required=True);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--initial-seconds',type=int,default=30);p.add_argument('--task',type=Path);p.add_argument('--fault',choices=['none','half','empty','wait'],default='none');a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve()
here=Path(__file__).resolve().parents[1];task=a.task.resolve() if a.task else here/'subtitles/task';original=here.parent/'integration/task'
files=[(here/'timeline'/name if name=='coordination-probe.c' else task/name) for name in (['coordination-probe.c','adaptive-session.c','component-group.c','container-task.c']+['webvtt-map.c'])]+[original/name for name in ['rewind-reader.c','random-access.c']]
cmd=['cc','-O2','-g',f'-I{task}',f'-I{original}',f'-I{a.native}/build',f'-I{a.native}/source',*map(str,files)]+[str(a.native/'build'/lib/f'{lib}.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
origin_source=here/'rolling-discontinuity/fixture-server.py'
input_hashes={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in files+[origin_source,here/'periods/fixture-server.py',here/'fixture-server.py',Path(__file__),*sorted(task.glob('*.h')),*sorted(original.glob('*.h')),a.native/'build-record.json',*[a.native/'build'/lib/f'{lib}.a' for lib in ['libavformat','libavcodec','libswresample','libavutil']]]}
with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
for file in files:(a.output/file.name).write_bytes(file.read_bytes())
spec=importlib.util.spec_from_file_location('fixture_server',origin_source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class FiniteOrigin(m.FixtureOrigin):
 def body(self,name):
  f=(self.fixtures/name).resolve()
  if not f.is_relative_to(self.fixtures) or not f.is_file():return 404,b'',False
  data=f.read_bytes()
  if name=='alternate/000.m4s' and a.fault in ['none','wait']:time.sleep(.5)
  if name=='low/002.m4s' and a.fault in ['half','empty']:
   if a.fault=='half':data=data[:len(data)//2]
   else:
    at=0
    while at+8<=len(data) and data[at+4:at+8]!=b'mdat':
     size=int.from_bytes(data[at:at+4],'big');assert size>=8 and at+size<=len(data);at+=size
    assert data[at+4:at+8]==b'mdat';data=data[:at+8]
  return 200,data,name.endswith(('.m3u8','.mpd'))
origin=FiniteOrigin(a.fixtures,a.output/'origin',initial_seconds=a.initial_seconds);server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
url=f'http://127.0.0.1:{server.server_port}/master.m3u8'
try:
 with (a.output/'stdout.jsonl').open('w')as out,(a.output/'stderr.log').open('w')as err:r=subprocess.run([str(a.output/'probe'),url,str(2 if a.fault=='wait' else int(a.fault in ['half','empty']))],stdout=out,stderr=err,timeout=45)
 result={'fault':a.fault,'scope':__doc__,'exit':r.returncode,'compile':cmd,'inputs':input_hashes,'packets':(a.output/'stdout.jsonl').read_text(),'requestStatuses':sorted(set(v['status'] for v in origin.requests)),'passed':r.returncode==0 and all(v['status'] in [200,206] for v in origin.requests)}
 if a.fault in ['half','empty']:result['passed'] &= not any(v.get('name',v.get('file'))=='low/003.m4s' for v in origin.requests)
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
