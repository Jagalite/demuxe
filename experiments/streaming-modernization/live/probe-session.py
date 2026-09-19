#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native integrated live packet coordinator, independent from Wasm/browser playback."""
import argparse,hashlib,importlib.util,json,subprocess,threading
from http.server import ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--native',type=Path,required=True);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve()
here=Path(__file__).resolve().parent;task=here/'task';original=here.parent/'integration/task'
files=[task/name for name in ['live-session-probe.c','adaptive-session.c','component-group.c','container-task.c']]+[original/name for name in ['rewind-reader.c','random-access.c']]
cmd=['cc','-O2','-g',f'-I{task}',f'-I{original}',f'-I{a.native}/build',f'-I{a.native}/source',*map(str,files)]+[str(a.native/'build'/lib/f'{lib}.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
input_hashes={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in files+[here/'fixture-server.py',a.native/'build/libavformat/libavformat.a']}
with (a.output/'compile.log').open('w')as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
for file in files:(a.output/file.name).write_bytes(file.read_bytes())
spec=importlib.util.spec_from_file_location('fixture_server',here/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
origin=m.FixtureOrigin(a.fixtures,a.output/'origin');server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
url=f'http://127.0.0.1:{server.server_port}/master.m3u8'
try:
 with (a.output/'stdout.jsonl').open('w')as out,(a.output/'stderr.log').open('w')as err:r=subprocess.run([str(a.output/'probe'),url],stdout=out,stderr=err,timeout=45)
 result={'scope':__doc__,'exit':r.returncode,'compile':cmd,'inputs':input_hashes,'packets':(a.output/'stdout.jsonl').read_text(),'requestStatuses':sorted(set(v['status'] for v in origin.requests)),'passed':r.returncode==0 and all(v['status'] in [200,206] for v in origin.requests)}
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
