# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,os,json
base=Path('research/items/granular-engine-loading');out=Path((base/'full-run.txt').read_text().strip());records=[]
for network in ['local','10mbps']:
 for pair in range(3):
  for candidate in ([False,True] if pair%2==0 else [True,False]):
   env={**os.environ,'STAGE':'performance-hevc','BROWSER':'firefox','NETWORK':network,'FIXTURE':'user','VARIANT':'lean','SOFTWARE':'software-hevc' if candidate else 'software-baseline'}
   p=subprocess.run(['node',str(base/'tests/full/browser.mjs')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
   rec={'browser':'firefox','network':network,'pair':pair,'candidate':candidate,'exit':p.returncode,'output':p.stdout};records.append(rec);(out/'hevc-performance-order.json').write_text(json.dumps(records,indent=2));print(json.dumps(rec),flush=True)
   if p.returncode:raise SystemExit('HEVC timing failed; stopped.')
