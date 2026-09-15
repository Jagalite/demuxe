#!/usr/bin/env python3
"""One recorded fixed live window for a real API/component boundary regression."""
import argparse,hashlib,importlib.util,json,os,subprocess,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
p=argparse.ArgumentParser(description=__doc__)
for name in ['archive','fixtures','output']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--format',choices=['hls','dash'],required=True);p.add_argument('--browser',choices=['chrome','firefox'],required=True);p.add_argument('--mode',choices=['hybrid','software'],required=True);a=p.parse_args();out=a.output.resolve();out.mkdir();here=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('origin',here.parent/'fixture-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Frozen(m.FixtureOrigin):
 def window(self):return (4,12)
# Keep wall-clock DASH DVR expiry outside this bounded 110-second test. The
# explicit SegmentTimeline and HTTP inventory still contain only segments 4..11.
# Rolling/expiry suites use the normal sixteen-second retention independently.
origin=Frozen(a.fixtures,out/'origin',window_seconds=86400);server=ThreadingHTTPServer(('127.0.0.1',0),origin.handler());thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
inputs={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [Path(__file__),here/'probe-browser.mjs',here.parent/'fixture-server.py']}
try:
 env=dict(os.environ,BETA_ARCHIVE=str(a.archive.resolve()),STREAM_FIXTURES=str(a.fixtures.resolve()),OUT=str(out/'browser'),LIVE_ORIGIN=f'http://127.0.0.1:{server.server_port}',BROWSER=a.browser,MODE=a.mode,FORMAT=a.format)
 with (out/'browser.log').open('w') as log:r=subprocess.run(['node',str(here/'probe-browser.mjs')],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=110)
 result={'scope':__doc__,'fixedSegmentWindow':[4,12],'dashRetentionSeconds':86400,'inputs':inputs,'exit':r.returncode,'browser':json.loads((out/'browser/result.json').read_text()),'requestStatuses':sorted(set(v['status'] for v in origin.requests))};result['passed']=r.returncode==0 and result['browser']['passed'] and all(v['status'] in [200,206] for v in origin.requests)
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':result['passed']}));raise SystemExit(0 if result['passed'] else 1)
finally:server.shutdown();server.server_close();thread.join();origin.flush()
