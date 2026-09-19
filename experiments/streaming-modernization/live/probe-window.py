#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compile and characterize the native HLS window hook with a controlled origin."""
import argparse, hashlib, importlib.util, json, subprocess, threading
from http.server import ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--plans',action='store_true');p.add_argument('--retirement',action='store_true');p.add_argument('--native',type=Path,required=True);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve()
here=Path(__file__).resolve().parent
probe=here/('window-plan-probe.c' if a.plans else 'window-probe.c')
spec=importlib.util.spec_from_file_location('fixture_origin',here/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
cmd=['cc','-O2',f'-I{a.native}/build',f'-I{a.native}/source',str(probe)]+[str(a.native/'build'/lib/f'{lib}.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]+['-lxml2','-lm','-lpthread','-o',str(a.output/'window-probe')]
if a.retirement:
 assert a.plans
 cmd.insert(1,'-DTEST_RETIREMENT=1')
input_hashes={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [probe,here/'fixture-server.py',a.native/'build/libavformat/libavformat.a']}
with (a.output/'compile.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
(a.output/probe.name).write_bytes(probe.read_bytes());(a.output/'fixture-server.py').write_bytes((here/'fixture-server.py').read_bytes())
origin=m.FixtureOrigin(a.fixtures,a.output/'origin');server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
url=f'http://127.0.0.1:{server.server_port}/master.m3u8'
try:
 with (a.output/'windows.jsonl').open('w') as out,(a.output/'stderr.log').open('w') as err:
  result=subprocess.run([str(a.output/'window-probe'),url,'24'],stdout=out,stderr=err,timeout=40)
 rows=[json.loads(line) for line in (a.output/'windows.jsonl').read_text().splitlines()]
 known=[r for r in rows if r['known']]
 checks={'exit':result.returncode==0,'reloaded':len(known)>=3,'windowMoves':len(known)>1 and known[-1]['start']>known[0]['start'],'bounded':all(0<r['end']-r['start']<=16000000 for r in known),'noExpiredOrFutureRequests':all(r['status'] in [200,206] for r in origin.requests)}
 record={'scope':'native parser/window observation, not browser playback','checks':checks,'passed':all(checks.values()),'planBoundaryChecks':a.plans,'compile':cmd,'inputs':input_hashes,'windows':rows}
 (a.output/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(checks));raise SystemExit(0 if record['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
