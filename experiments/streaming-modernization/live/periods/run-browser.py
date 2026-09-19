#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fresh recorded rolling origin for one real browser/decoder live playback case."""
import argparse,hashlib,importlib.util,json,os,subprocess,threading
from http.server import ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['archive','fixtures','output']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--format',choices=['hls','dash'],default='hls');p.add_argument('--browser',choices=['chrome','firefox'],required=True);p.add_argument('--mode',choices=['hybrid','software'],required=True);p.add_argument('--expiry',action='store_true');a=p.parse_args();a.output=a.output.resolve();a.output.mkdir()
here=Path(__file__).resolve().parent
probe=here.parent/'probe-browser.mjs'
spec=importlib.util.spec_from_file_location('fixture_server',here/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
origin=m.FixtureOrigin(a.fixtures,a.output/'origin');server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [here/'fixture-server.py',here.parent/'fixture-server.py',probe,Path(__file__)]}
try:
 env=dict(os.environ,BETA_ARCHIVE=str(a.archive.resolve()),STREAM_FIXTURES=str(a.fixtures.resolve()),OUT=str(a.output/'browser'),BROWSER=a.browser,MODE=a.mode,FORMAT=a.format,LIVE_ORIGIN=f'http://127.0.0.1:{server.server_port}')
 if a.expiry:env['EXPIRE_PAUSE_MS']='20000'
 with (a.output/'browser.log').open('w')as log:r=subprocess.run(['node',str(probe)],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=180)
 result={'scope':__doc__,'inputs':inputs,'exit':r.returncode,'browser':json.loads((a.output/'browser/result.json').read_text()),'requestStatuses':sorted(set(v['status'] for v in origin.requests))}
 result['passed']=r.returncode==0 and result['browser']['passed'] and all(v['status'] in [200,206] for v in origin.requests)
 (a.output/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'exit':r.returncode,'statuses':result['requestStatuses']}));raise SystemExit(0 if result['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
