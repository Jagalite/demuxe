#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Sanitized native live-start preroll admission; ordinary seeks remain strict."""
import argparse,hashlib,importlib.util,json,subprocess,threading,shutil
from pathlib import Path
from http.server import ThreadingHTTPServer
p=argparse.ArgumentParser(description=__doc__)
for name in ['native','fixtures','output']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--task',type=Path);a=p.parse_args();out=a.output.resolve();out.mkdir();here=Path(__file__).resolve().parent;native=a.native.resolve();task=a.task.resolve() if a.task else here.parent/'subtitles/task';original=here.parents[1]/'integration/task'
files=[here/'preroll-probe.c']+[task/n for n in ['adaptive-session.c','component-group.c','container-task.c','webvtt-map.c']]+[original/n for n in ['rewind-reader.c','random-access.c']]
libraries=[native/'build'/n/(n+'.a') for n in ['libavformat','libavcodec','libswresample','libavutil']]
cmd=['cc','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+str(task),'-I'+str(original),'-I'+str(native/'source'),'-I'+str(native/'build'),*map(str,files+libraries),'-lxml2','-lm','-lpthread','-o',str(out/'probe')]
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();inputs={str(f):sha(f) for f in files+libraries+[Path(__file__),here.parent/'fixture-server.py',native/'build-record.json',*task.glob('*.h'),*original.glob('*.h')]}
for f in files:shutil.copy2(f,out/f.name)
with (out/'compile.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
spec=importlib.util.spec_from_file_location('origin',here.parent/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Frozen(m.FixtureOrigin):
 def window(self):return (4,12)
origin=Frozen(a.fixtures,out/'origin');server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with (out/'stdout.json').open('w') as stdout,(out/'stderr.log').open('w') as stderr:r=subprocess.run([str(out/'probe'),f'http://127.0.0.1:{server.server_port}/master.m3u8'],stdout=stdout,stderr=stderr,timeout=20)
 packets=json.loads((out/'stdout.json').read_text());result={'scope':__doc__,'command':cmd,'inputs':inputs,'exit':r.returncode,'packets':packets,'requestStatuses':sorted(set(v['status'] for v in origin.requests)),'passed':r.returncode==0 and all(v['status'] in [200,206] for v in origin.requests),'stderrSHA256':sha(out/'stderr.log')};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['packets']));raise SystemExit(0 if result['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
