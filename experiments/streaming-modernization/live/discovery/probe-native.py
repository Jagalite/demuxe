#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native sparse DASH discovery with deterministic oldest-segment expiry."""
import argparse,hashlib,importlib.util,json,subprocess,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
p=argparse.ArgumentParser(description=__doc__)
for name in ['native','fixtures','output']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();a.output=a.output.resolve();a.output.mkdir();a.native=a.native.resolve();here=Path(__file__).resolve().parent
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
source=here/'probe.c';libs=[a.native/'build'/lib/(lib+'.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']]
cmd=['cc','-O1','-g','-fsanitize=address,undefined',f'-I{a.native}/build',f'-I{a.native}/source',str(source),*map(str,libs),'-lxml2','-lm','-lpthread','-o',str(a.output/'probe')]
with (a.output/'compile.log').open('w') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True)
spec=importlib.util.spec_from_file_location('origin',here/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
origin=m.FixtureOrigin(a.fixtures,a.output/'origin');server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with (a.output/'stdout.json').open('w') as out,(a.output/'stderr.log').open('w') as err:
  run=subprocess.run([str(a.output/'probe'),f'http://127.0.0.1:{server.server_port}/dash/manifest.mpd'],stdout=out,stderr=err,timeout=30)
 observed=json.loads((a.output/'stdout.json').read_text())
 media=[r['name'] for r in origin.requests if r['name'].startswith('dash/chunk-')]
 expected=[f'dash/chunk-stream{i}-00010.m4s' for i in [0,3,4]]
 record={'scope':__doc__,'exit':run.returncode,'command':cmd,'observed':observed,'initialMediaResources':media,'expiredDiscoveryRequests':origin.expired_discovery_requests,
  'inputs':{str(f):sha(f) for f in [Path(__file__),source,here/'fixture-server.py',here.parent/'fixture-server.py',a.native/'build-record.json',a.native/'source/libavformat/dashdec.c',*libs]},
  'stderrSHA256':sha(a.output/'stderr.log'),'passed':run.returncode==0 and not origin.expired_discovery_requests and media==expected}
 (a.output/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record));raise SystemExit(0 if record['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
