#!/usr/bin/env python3
"""Run injected unit regressions against modules extracted from one exact archive."""
import argparse,hashlib,json,os,re,subprocess,tarfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--archive',required=True,type=Path);p.add_argument('--output',required=True,type=Path)
a=p.parse_args();out=a.output.resolve();out.mkdir();archive=a.archive.resolve()
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
with tarfile.open(archive) as t:t.extractall(out/'extracted',filter='data')
package=out/'extracted/package';manifest=json.loads((package/'release-manifest.json').read_text())
for name,entry in manifest['files'].items():assert sha(package/name)==entry['sha256'],name
root=Path(__file__).resolve().parent
files=sorted(root.glob('*/*.test.mjs'))+[root/'live/network/timeout-code.test.mjs']
assert len(files)==17,len(files)
env=dict(os.environ,RUNTIME_PACKAGE=str(package),TRANSPORT_WEB=str(package/'web'),
 INTEGRATION_ROOT=str(package),TRANSPORT_MODULE=str(package/'web/incremental-transport.js'),
 RESOURCE_LOADER=str(package/'web/resource-loader.js'),QUALITY_MODULE=str(package/'web/generated/internal/quality.js'),
 UNIFIED_PLAYER_MODULE=str(package/'web/generated/unified-player.js'),RETAINED_WORKER=str(package/'web/filter-retained-engine-worker.js'))
with (out/'tests.log').open('w') as log:
 r=subprocess.run(['node','--test','--test-reporter=tap',*map(str,files)],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=180)
text=(out/'tests.log').read_text();count=lambda key:int(re.search(r'^# '+key+r' (\d+)$',text,re.M).group(1))
record={'scope':__doc__,'releaseQualified':False,'archiveSHA256':sha(archive),'driverSHA256':sha(Path(__file__)),
 'harnesses':{str(f.relative_to(root)):sha(f) for f in files},'exit':r.returncode,'logSHA256':sha(out/'tests.log')}
for key in ['tests','pass','fail','cancelled','skipped']:record[key]=count(key)
record['passed']=r.returncode==0 and record['tests']>0 and record['pass']==record['tests']
(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({k:v for k,v in record.items() if k!='harnesses'}));raise SystemExit(0 if record['passed'] else 1)
